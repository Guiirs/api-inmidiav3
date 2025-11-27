import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

// Config
import swaggerConfig from './config/swaggerConfig';
import connectDB from './config/dbMongo';
import logger from './config/logger';
import config from './config/config';

// Middlewares
import { errorHandler, sanitize, globalRateLimiter } from './middlewares';

// Utils
import AppError from './utils/AppError';

// Services and Middlewares (imported for Socket.IO and other features)
import socketAuthMiddleware from './middlewares/socketAuthMiddleware';
import notificationService from './services/notificationService';
import whatsappService from './services/whatsappService';
import scheduleJobs from './scripts/updateStatusJob';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import placaRoutes from './routes/placas';
import empresaRoutes from './routes/empresaRoutes';
import adminRoutes from './routes/adminRoutes';
import regiaoRoutes from './routes/regiaoRoutes';
import clienteRoutes from './routes/clienteRoutes';
import aluguelRoutes from './routes/aluguelRoutes';
import relatoriosRoutes from './routes/relatoriosRoutes';
import publicApiRoutes from './routes/publicApiRoutes';
import piRoutes from './routes/piRoutes';
import contratoRoutes from './routes/contratoRoutes';
import scriptRoutes from './routes/scriptRoutes';
import biWeekRoutes from './routes/biWeeks';
import webhookRoutes from './routes/webhookRoutes';
import sseRoutes from './routes/sseRoutes';
import whatsappRoutes from './routes/whatsappRoutes';
import publicRegisterRoutes from './routes/publicRegisterRoutes';

// Load environment variables
dotenv.config();

// Database connection
connectDB()
  .then(async () => {
    logger.info('[DB] ✅ Conexão estabelecida com sucesso');
  })
  .catch((err) => {
    logger.error(`[DB] ❌ Erro ao conectar: ${err.message}`);
    process.exit(1);
  });

// Initialize Express app
const app: Application = express();

// --- Essential Middlewares ---
app.use(helmet()); // Security headers

// Global rate limiting (2000 req/min per IP)
app.use('/api', globalRateLimiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitization middleware (NoSQL injection protection)
app.use(sanitize);

// Static files
app.use(express.static('public'));

// Health check endpoint (no rate limit)
app.get('/api/v1/status', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

logger.info('[Routes] Health check endpoints disponíveis em /status e /health');

// API Documentation (Swagger)
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerConfig));
logger.info('[Routes] Swagger documentation available at /api/v1/docs');

// --- Public Routes ---
app.use('/api/v1/public', publicRegisterRoutes);
app.use('/api/empresas', publicRegisterRoutes); // Legacy compatibility
logger.info('[Routes] Public registration available at /api/v1/public/register');

// --- Protected API Routes (v1) ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/placas', placaRoutes);
app.use('/api/v1/empresa', empresaRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/regioes', regiaoRoutes);
app.use('/api/v1/clientes', clienteRoutes);
app.use('/api/v1/alugueis', aluguelRoutes);
app.use('/api/v1/relatorios', relatoriosRoutes);
app.use('/api/v1/pis', piRoutes);
app.use('/api/v1/contratos', contratoRoutes);
app.use('/api/v1/scripts', scriptRoutes);
app.use('/api/v1/bi-weeks', biWeekRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/sse', sseRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);

// Public API routes (API Key authentication)
app.use('/api/public', publicApiRoutes);

// --- Error Handlers ---

// 404 Handler
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Rota não encontrada: ${req.originalUrl}`, 404));
});

// Global Error Handler (must be last middleware)
app.use(errorHandler);

// --- Server Initialization ---
const PORT = config.port;

let server: http.Server | undefined;
let io: SocketIOServer | undefined;

if (process.env.NODE_ENV !== 'test') {
  server = http.createServer(app);

  // Socket.IO Configuration
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Socket.IO authentication middleware
  io.use(socketAuthMiddleware);

  // Connection management
  io.on('connection', (socket: any) => {
    const { id: userId, empresaId, role, username } = socket.user;

    logger.info(`[Socket.IO] 🔌 Client connected: ${username} (${socket.id})`);

    // Join user and company rooms
    socket.join(`user_${userId}`);
    socket.join(`empresa_${empresaId}`);

    if (role === 'admin') {
      socket.join('admins');
      logger.debug(`[Socket.IO] Admin ${username} joined 'admins' room`);
    }

    // Ping/pong test event
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Disconnect
    socket.on('disconnect', (reason: string) => {
      logger.info(`[Socket.IO] 🔌 Client disconnected: ${username} (${socket.id}) - Reason: ${reason}`);
    });

    // Error
    socket.on('error', (error: Error) => {
      logger.error(`[Socket.IO] ❌ Socket error ${socket.id}: ${error.message}`);
    });
  });

  // Initialize notification service
  notificationService.initialize(io);
  logger.info('[Socket.IO] ✅ Socket.IO configured and ready');

  // Initialize WhatsApp service (if enabled)
  if (process.env.WHATSAPP_ENABLED === 'true') {
    whatsappService.initialize().catch((err: Error) => {
      logger.error(`[WhatsApp] Error initializing: ${err.message}`);
      logger.warn('[WhatsApp] Continuing without WhatsApp...');
    });
  }

  // Start server
  server.listen(PORT, () => {
    logger.info(`🚀 Server running in ${config.nodeEnv} mode on port ${PORT}`);
    logger.info(`📚 API Documentation: http://localhost:${PORT}/api/v1/docs`);
    logger.info(`🔌 Socket.IO: ws://localhost:${PORT}`);

    // Schedule cron jobs
    scheduleJobs();
    logger.info('[Cron] ⏰ Jobs scheduled');
  });
} else {
  logger.info('[Server] Test mode detected - HTTP server not started');
}

// --- Process Error Handlers ---

// Uncaught Exception Handler
process.on('uncaughtException', (err: Error) => {
  logger.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
  logger.error(`Name: ${err.name}`);
  logger.error(`Message: ${err.message}`);
  logger.error(`Stack: ${err.stack}`);
  process.exit(1);
});

// Unhandled Rejection Handler
process.on('unhandledRejection', (err: Error) => {
  logger.error('💥 UNHANDLED REJECTION! Shutting down...');
  logger.error(`Name: ${err.name}`);
  logger.error(`Message: ${err.message}`);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM received. Shutting down gracefully...');
  if (server) {
    server.close(() => {
      logger.info('💤 Process terminated');
    });
  }
});

// Export app for testing
export default app;
