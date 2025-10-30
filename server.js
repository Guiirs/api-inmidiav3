// server.js

require('dotenv').config(); // Carrega variáveis de ambiente do .env
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerConfig'); // Configuração do Swagger
const connectDB = require('./config/dbMongo'); // Função de conexão com MongoDB (MODIFICADA)
const logger = require('./config/logger'); // Winston logger
const errorHandler = require('./middlewares/errorHandler'); // Middleware de tratamento de erros

// --- MELHORIA: Importações de Segurança e Logging ---
const helmet = require('helmet'); // Para segurança HTTP
const morgan = require('morgan'); // Para logging de requisições
// --- FIM MELHORIA ---

// Importação das rotas (Assumindo que os ficheiros de rota exportam o router ou uma função)
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

logger.info('[Server] Rotas importadas com sucesso.');

// Inicializa a aplicação Express
const app = express();

// >>> 1. CORREÇÃO ESSENCIAL PARA AMBIENTES COM PROXY (SQUARE CLOUD) <<<
app.set('trust proxy', 1);

// Conecta à Base de Dados MongoDB (agora verifica NODE_ENV='test' internamente)
connectDB();

// Configuração do CORS (Ajustada para o ambiente Square Cloud e local)
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:5173', // Sua porta local
    'https://inmidia.squareweb.app' // SEU FRONTEND EM PRODUÇÃO
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

// --- MELHORIA: Middlewares de Segurança e Logging ---
app.use(helmet()); // 🔒 Adiciona 11 middlewares de segurança HTTP
// --- FIM MELHORIA ---

// Middlewares Essenciais
app.use(express.json()); // Para fazer parse do body de requisições JSON
app.use(express.urlencoded({ extended: true })); // Para fazer parse de formulários URL-encoded

// --- MELHORIA: Integração do Morgan com Winston ---
// Usa o stream do logger para integrar os logs HTTP do morgan
app.use(morgan('dev', { stream: logger.stream }));
// --- FIM MELHORIA ---


// >>> 2. MONTAGEM CORRIGIDA DAS ROTAS (Mistura de Funções e Objetos) <<<
// ROTAS QUE EXPORTAM O OBJETO ROUTER DIRETAMENTE (SEM [])
app.use('/api/auth', authRoutes);
app.use('/api/placas', placaRoutes);
app.use('/api/clientes', clienteRoutes);

// ROTAS QUE EXPORTAM UMA FUNÇÃO (COM [])
app.use('/api/user', userRoutes());
app.use('/api/empresas', empresaRoutes());
app.use('/api/regioes', regiaoRoutes());
app.use('/api/alugueis', aluguelRoutes());
app.use('/api/admin', adminRoutes());
app.use('/api/relatorios', relatoriosRoutes());
app.use('/api/public', publicApiRoutes());

// Rota para a documentação Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
logger.info('[Server] Rota /api-docs para Swagger UI configurada.');

// 3. Rota de Teste Simples na base /api (Fixa Cannot GET /api)
app.get('/api', (req, res) => {
    res.status(200).json({
        message: 'API InMidia está a funcionar na base /api. Use as rotas /auth, /placas, etc.',
        status: 'ok'
    });
});
logger.info('[Server] Rota /api para teste de base configurada.');

// Rota de Teste Simples (para o root do domínio)
app.get('/', (req, res) => {
    res.send('API InMidia está a funcionar!'); // Não HTML!
});


// 4. TRATAMENTO DE ERRO 404 (Último antes do errorHandler)
app.use((req, res, next) => {
    const error = new Error(`Não Encontrado: A rota ${req.originalUrl} não existe na API.`);
    error.status = 404;
    next(error); // Passa para o errorHandler
});

// Middleware de Tratamento de Erros (deve ser o último middleware)
app.use(errorHandler);

// <<< MODIFICAÇÃO INÍCIO >>>
const PORT = process.env.PORT || 3000;
let server; // Variável para guardar a instância do servidor

// Inicia o servidor apenas se não estiver em ambiente de teste
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    logger.info(`[Server] Servidor a correr na porta ${PORT}`);
    // --- MELHORIA: Log do Ambiente ---
    logger.info(`[Server] Ambiente: ${process.env.NODE_ENV || 'development'}`);
    // --- FIM MELHORIA ---
    logger.info(`[Server] Documentação API disponível em /api-docs`);
  });
}

// Tratamento para Encerramento Gracioso (ajustado para usar a variável server)
process.on('SIGINT', async () => {
    logger.info('[Server] Recebido SIGINT. A desligar graciosamente...');
    try {
        await mongoose.connection.close();
        logger.info('[Server] Conexão MongoDB fechada.');
        // Fecha o servidor HTTP se ele estiver rodando
        if (server) {
            server.close(() => {
                logger.info('[Server] Servidor HTTP fechado.');
                process.exit(0);
            });
        } else {
             process.exit(0); // Sai se o servidor não estava rodando (testes)
        }
    } catch (err) {
        logger.error('[Server] Erro durante o encerramento:', err);
        process.exit(1);
    }
});

// Exporta a instância do app Express para ser usada pelos testes
module.exports = app;
// <<< MODIFICAÇÃO FIM >>>