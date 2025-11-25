// server.js
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerConfig = require('./swaggerConfig'); 
const connectDB = require('./config/dbMongo');
const logger = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/AppError');
const scheduleJobs = require('./scripts/updateStatusJob');
const cacheService = require('./services/cacheService');
const { globalRateLimiter } = require('./middlewares/rateLimitMiddleware');
const sanitizeMiddleware = require('./middlewares/sanitizeMiddleware');
const socketAuthMiddleware = require('./middlewares/socketAuthMiddleware');
const notificationService = require('./services/notificationService');

// Carrega variáveis de ambiente
require('dotenv').config();

// Conecta à Base de Dados
connectDB();

// Inicializa cache Redis (se configurado)
cacheService.initializeRedis().catch(err => {
  logger.warn('[Server] Cache Redis não inicializado:', err.message);
});

const app = express();

// --- Middlewares Essenciais ---
app.use(helmet()); // Adiciona headers de segurança

// Rate limiting global (2000 req/min por IP)
app.use('/api', globalRateLimiter);

// *** CORREÇÃO APLICADA AQUI ***
// Dizemos ao CORS para aceitar explicitamente a URL do frontend
// que está no seu ficheiro .env.example
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
// *** FIM DA CORREÇÃO ***

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitização customizada contra NoSQL injection (compatível com Express 5)
// Sanitiza req.body e req.params (req.query é read-only no Express 5)
app.use(sanitizeMiddleware);

app.use(express.static('public')); // Serve ficheiros estáticos (ex: logos para PDF)

// --- Importação de Rotas ---
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const placaRoutes = require('./routes/placas');
const empresaRoutes = require('./routes/empresaRoutes'); // Já estava aqui
const adminRoutes = require('./routes/adminRoutes');
const regiaoRoutes = require('./routes/regiaoRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const aluguelRoutes = require('./routes/aluguelRoutes');
const relatoriosRoutes = require('./routes/relatoriosRoutes');
const publicApiRoutes = require('./routes/publicApiRoutes');
const piRoutes = require('./routes/piRoutes');
const contratoRoutes = require('./routes/contratoRoutes');
const scriptRoutes = require('./routes/scriptRoutes');
const piGenRoutes = require('./PISystemGen/routes');
const healthController = require('./controllers/healthController');
const biWeekRoutes = require('./routes/biWeeks');
const webhookRoutes = require('./routes/webhookRoutes'); // [NOVO] Webhooks
const sseRoutes = require('./routes/sseRoutes'); // [NOVO] Server-Sent Events

// --- [CORREÇÃO] Importa a nova rota de registo pública ---
const publicRegisterRoutes = require('./routes/publicRegisterRoutes');
// --- Fim da Correção ---

// Rotas de Health Check (sem rate limit)
app.get('/api/v1/status', healthController.healthCheck);
app.get('/api/v1/health', healthController.healthCheck); // Alias
app.get('/api/v1/ready', healthController.readinessCheck); // Kubernetes readiness
app.get('/api/v1/live', healthController.livenessCheck);   // Kubernetes liveness

logger.info('[Routes] Health check endpoints disponíveis em /status, /health, /ready, /live');

// Rota de Status (Health Check) - DEPRECADA, manter para compatibilidade
app.get('/api/v1/status-legacy', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Rota da Documentação API (Swagger)
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerConfig));


// --- [NOVO] Define a rota de registo pública (versionada) ---
// Movida para /api/v1/public/register para padronização
app.use('/api/v1/public', publicRegisterRoutes);
// Mantém compatibilidade com rota antiga (deprecar futuramente)
app.use('/api/empresas', publicRegisterRoutes);
logger.info('[Routes Public] Rota de registro público disponível em /api/v1/public/register e /api/empresas/register (legado)');
// --- Fim da Correção ---


// --- Define as rotas da API (Protegidas com /v1) ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/placas', placaRoutes);

// --- [CORREÇÃO APLICADA AQUI] ---
// Esta linha estava em falta. Ela liga o 'empresaRoutes.js' à aplicação.
app.use('/api/v1/empresa', empresaRoutes);
// ---------------------------------

app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/regioes', regiaoRoutes);
app.use('/api/v1/clientes', clienteRoutes);
app.use('/api/v1/alugueis', aluguelRoutes);
app.use('/api/v1/relatorios', relatoriosRoutes);
app.use('/api/v1/pis', piRoutes);
app.use('/api/v1/contratos', contratoRoutes);
// Rota para executar scripts internos (apenas para administradores)
app.use('/api/v1/scripts', scriptRoutes);
// Rotas do subsistema PISystemGen
app.use('/api/v1/pi-gen', piGenRoutes);
// Rotas do calendário de Bi-Semanas (14 dias)
app.use('/api/v1/bi-weeks', biWeekRoutes);
// [NOVO] Rotas de Webhooks (apenas admins)
app.use('/api/v1/webhooks', webhookRoutes);
// [NOVO] Rotas de Server-Sent Events (tempo real)
app.use('/api/v1/sse', sseRoutes);

// --- Rotas de TESTE (PROTEGIDAS COM ADMIN) ---
// ⚠️ ATENÇÃO: Estas rotas devem ser desabilitadas em produção
// Para desabilitar, comente o bloco abaixo ou use NODE_ENV=production
if (process.env.NODE_ENV !== 'production') {
    const testExcelRoutes = require('./routes/testExcelRoutes');
    app.use('/api/v1', testExcelRoutes);
    logger.warn('[Routes Test] ⚠️ Rotas de teste de Excel/PDF habilitadas (PROTEGIDAS). Desabilite em produção!');
} else {
    logger.info('[Routes Test] Rotas de teste desabilitadas (modo produção).');
}

// --- Rotas Públicas da API (API Key) ---
app.use('/api/public', publicApiRoutes);

// --- Middlewares de Erro ---

// Handler para rotas 404 (Não Encontrado)
app.use((req, res, next) => {
    next(new AppError(`Não Encontrado: A rota ${req.originalUrl} não existe na API.`, 404));
});

// Handler de Erro Global (deve ser o último middleware)
app.use(errorHandler);

// --- Inicialização do Servidor ---
const PORT = process.env.PORT || 3000;
// Exporta o `app` para que os testes com SuperTest possam requerer o express app
// e evita que o processo abra uma porta quando estiver em ambiente de teste.
let server;
let io; // Socket.IO instance

if (process.env.NODE_ENV !== 'test') {
    server = http.createServer(app);
    
    // --- Configuração do Socket.IO ---
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    // Middleware de autenticação para Socket.IO
    io.use(socketAuthMiddleware);

    // Gerenciamento de conexões
    io.on('connection', (socket) => {
        const { id: userId, empresaId, role, username } = socket.user;
        
        logger.info(`[Socket.IO] 🔌 Cliente conectado: ${username} (${socket.id})`);

        // Entra em rooms baseadas no usuário e empresa
        socket.join(`user_${userId}`);
        socket.join(`empresa_${empresaId}`);
        
        // Se for admin, entra na room de admins
        if (role === 'admin') {
            socket.join('admins');
            logger.debug(`[Socket.IO] Admin ${username} entrou na room 'admins'`);
        }

        // Evento de teste/ping
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });

        // Desconexão
        socket.on('disconnect', (reason) => {
            logger.info(`[Socket.IO] 🔌 Cliente desconectado: ${username} (${socket.id}) - Razão: ${reason}`);
        });

        // Erro
        socket.on('error', (error) => {
            logger.error(`[Socket.IO] ❌ Erro no socket ${socket.id}: ${error.message}`);
        });
    });

    // Inicializa serviço de notificações com a instância do Socket.IO
    notificationService.initialize(io);
    logger.info('[Socket.IO] ✅ Socket.IO configurado e pronto');

    server.listen(PORT, () => {
        logger.info(`Servidor a correr em modo ${process.env.NODE_ENV || 'development'} na porta ${PORT}`);
        logger.info(`Documentação da API disponível em http://localhost:${PORT}/api/v1/docs`);
        logger.info(`Socket.IO disponível em ws://localhost:${PORT}`);

        // Inicia os Cron Jobs somente em ambientes não-test
        scheduleJobs();
    });
} else {
    logger.info('[Server] Modo de teste detectado - não será iniciada uma porta HTTP nem cron jobs.');
}

// --- Handlers de Processos Não Tratados ---
// Handler para erros síncronos não capturados
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥');
    console.error('Nome:', err.name);
    console.error('Mensagem:', err.message);
    console.error('Stack completo:', err.stack);
    console.error('Erro completo:', err);
    logger.error('UNCAUGHT EXCEPTION! 💥 A desligar...');
    logger.error(err.name, err.message);
    logger.error('Stack:', err.stack);
    // Encerra processo de forma controlada
    process.exit(1);
});

// Handle de erros assíncronos não tratados
process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 A desligar...');
    logger.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

// Exporta o app (Express) para testes e outros usos (ex: serverless handlers)
module.exports = app;