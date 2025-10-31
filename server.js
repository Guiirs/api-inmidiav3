// server.js
require('dotenv').config(); // Carrega variáveis de ambiente do .env
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerConfig'); // Configuração do Swagger
const connectDB = require('./config/dbMongo'); // Função de conexão com MongoDB
const logger = require('./config/logger'); // Winston logger
const errorHandler = require('./middlewares/errorHandler'); // Middleware de tratamento de erros
const helmet = require('helmet'); // Para segurança HTTP
const morgan = require('morgan'); // Para logging de requisições
const cron = require('node-cron'); // Importa o node-cron
const rateLimit = require('express-rate-limit'); // [MELHORIA] Importa o rate-limit
const AppError = require('./utils/AppError'); // Importa o AppError para 404

// [MELHORIA] Importa os scripts do Cron Job
const updatePlacaStatusJob = require('./scripts/updateStatusJob');
const performBackupJob = require('./scripts/backupJob'); // [MELHORIA] Importa o novo job de backup

// Importação das rotas (existentes)
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const empresaRoutes = require('./routes/empresaRoutes');
const regiaoRoutes = require('./routes/regiaoRoutes');
const placaRoutes = require('./routes/placas');
const clienteRoutes = require('./routes/clienteRoutes');
const aluguelRoutes = require('./routes/aluguelRoutes');
const adminRoutes = require('./routes/adminRoutes');
const relatoriosRoutes = require('./routes/relatoriosRoutes');
const publicApiRoutes = require('./routes/publicApiRoutes');

// [MELHORIA] Importa as novas rotas de PIs e Contratos
const piRoutes = require('./routes/piRoutes');
const contratoRoutes = require('./routes/contratoRoutes');

logger.info('[Server] Rotas importadas com sucesso.');

// Inicializa a aplicação Express
const app = express();

// >>> 1. CORREÇÃO ESSENCIAL PARA AMBIENTES COM PROXY (SQUARE CLOUD) <<<
app.set('trust proxy', 1);

// Conecta à Base de Dados MongoDB
connectDB();

// Configuração do CORS
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:5173', 
    'https://inmidia.squareweb.app'
];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Bloqueada origem não permitida: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// --- Middlewares de Segurança e Logging ---
app.use(helmet()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use(morgan('dev', { stream: logger.stream }));

// [MELHORIA] Aplica Rate Limit Global a todas as rotas
const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 200, // Limite de 200 requisições por IP a cada 15 min
	message: { message: 'Muitas requisições. Tente novamente mais tarde.' },
    standardHeaders: true,
	legacyHeaders: false,
    handler: (req, res, next, options) => {
        // O 'trust proxy' é necessário para obter o IP correto
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip;
        logger.warn(`[RateLimit - Global] Limite de taxa atingido para IP: ${ip}. Rota: ${req.originalUrl}`);
        res.status(options.statusCode).send(options.message);
    }
});
app.use(globalLimiter);

// --- ROTEADOR PRINCIPAL E VERSIONAMENTO ---
const apiRouter = express.Router();

// Monta todas as rotas no roteador v1.
apiRouter.use('/auth', authRoutes);
apiRouter.use('/placas', placaRoutes);
apiRouter.use('/clientes', clienteRoutes);
apiRouter.use('/user', userRoutes);
apiRouter.use('/empresas', empresaRoutes);
apiRouter.use('/regioes', regiaoRoutes);
apiRouter.use('/alugueis', aluguelRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/relatorios', relatoriosRoutes);
apiRouter.use('/public', publicApiRoutes);

// [MELHORIA] Monta as novas rotas no roteador v1
apiRouter.use('/pis', piRoutes); // Rotas de Propostas Internas
apiRouter.use('/contratos', contratoRoutes); // Rotas de Contratos

// Monta o roteador v1 no prefixo /api/v1
app.use('/api/v1', apiRouter);
logger.info('[Server] Rotas da API V1 montadas com sucesso em /api/v1.');
// --- FIM DA MELHORIA ---


// Rota para a documentação Swagger UI (fora do versionamento v1)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
logger.info('[Server] Rota /api-docs para Swagger UI configurada.');

// Rota de Teste Simples na base /api
app.get('/api', (req, res) => {
    res.status(200).json({
        message: 'API InMidia está a funcionar. A versão 1 está em /api/v1.',
        status: 'ok',
        docs: '/api-docs'
    });
});
logger.info('[Server] Rota /api para teste de base configurada.');

// Rota de Teste Simples (para o root do domínio)
app.get('/', (req, res) => {
    res.send('API InMidia está a funcionar!');
});


// [MELHORIA] TRATAMENTO DE ERRO 404 (Último antes do errorHandler)
app.use((req, res, next) => {
    const error = new AppError(`Não Encontrado: A rota ${req.originalUrl} não existe na API.`, 404);
    next(error); // Passa para o errorHandler
});

// Middleware de Tratamento de Erros (deve ser o último middleware)
app.use(errorHandler);


const PORT = process.env.PORT || 3000;
let server; // Variável para guardar a instância do servidor

// Inicia o servidor apenas se não estiver em ambiente de teste
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    logger.info(`[Server] Servidor a correr na porta ${PORT}`);
    logger.info(`[Server] Ambiente: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`[Server] Documentação API disponível em /api-docs`);

    // --- [MELHORIA] INICIA OS CRON JOBS ---
    
    // Job 1: Atualização de Status (Placas e PIs)
    // '0 1 * * *' = (minuto 0, hora 1, todo dia, todo mês, todo dia da semana)
    cron.schedule('0 1 * * *', () => {
        logger.info('[CRON] Executando tarefa agendada de atualização de status (Placas e PIs)...');
        updatePlacaStatusJob(); 
    }, {
        scheduled: true,
        // timezone: "America/Sao_Paulo" // Descomente se o fuso horário do servidor for diferente
    });
    logger.info('[CRON] Tarefa de atualização de status (Placas e PIs) agendada para 01:00 (horário do servidor).');

    // Job 2: Backup do Banco de Dados
    // '0 2 * * *' = (minuto 0, hora 2, todo dia, todo mês, todo dia da semana)
    cron.schedule('0 2 * * *', () => {
        logger.info('[CRON] Executando tarefa agendada de BACKUP do MongoDB...');
        performBackupJob(); 
    }, {
        scheduled: true,
        // timezone: "America/Sao_Paulo"
    });
    logger.info('[CRON] Tarefa de backup do MongoDB agendada para 02:00 (horário do servidor).');
    
    // --- FIM DA MELHORIA ---
  });
}

// Tratamento para Encerramento Gracioso
process.on('SIGINT', async () => {
    logger.info('[Server] Recebido SIGINT. A desligar graciosamente...');
    try {
        await mongoose.connection.close();
        logger.info('[Server] Conexão MongoDB fechada.');
        if (server) {
            server.close(() => {
                logger.info('[Server] Servidor HTTP fechado.');
                process.exit(0);
            });
        } else {
             process.exit(0);
        }
    } catch (err) {
        logger.error('[Server] Erro durante o encerramento:', err);
        process.exit(1);
    }
});

// Exporta a instância do app Express para ser usada pelos testes
module.exports = app;