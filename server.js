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

// Importação das rotas (Assumindo que os ficheiros de rota exportam uma função)
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

// Conecta à Base de Dados MongoDB
connectDB();

// Configuração do CORS (Ajustada para o ambiente Square Cloud e local)
const allowedOrigins = [
    'http://localhost:5500', // Exemplo: Live Server
    'http://127.0.0.1:5500', // Exemplo: Live Server
    'http://localhost:3000', // Exemplo: Frontend dev
    'http://localhost:4000', // ADICIONADO: Sua porta local
    'https://inmidia.squareweb.app' // SEU FRONTEND EM PRODUÇÃO (ou URL API)
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


// Middlewares Essenciais
app.use(express.json()); // Para fazer parse do body de requisições JSON
app.use(express.urlencoded({ extended: true })); // Para fazer parse de formulários URL-encoded


// Configuração das Rotas da API (Chamando a função exportada de cada router)
app.use('/api/auth', authRoutes()); 
app.use('/api/user', userRoutes());
app.use('/api/empresas', empresaRoutes()); 
app.use('/api/regioes', regiaoRoutes());
app.use('/api/placas', placaRoutes()); 
app.use('/api/clientes', clienteRoutes());
app.use('/api/alugueis', aluguelRoutes());
app.use('/api/admin', adminRoutes());
app.use('/api/relatorios', relatoriosRoutes());
app.use('/api/public', publicApiRoutes()); 


// Rota para a documentação Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
logger.info('[Server] Rota /api-docs para Swagger UI configurada.');

// >>> 2. CORREÇÃO DE ROTEAMENTO: Rota de Teste Simples na base /api (Fixa Cannot GET /api) <<<
app.get('/api', (req, res) => {
    // Resposta JSON para confirmar que o API_BASE_URL está correto
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


// >>> 3. TRATAMENTO DE ERRO 404 (Último antes do errorHandler) <<<
// Este middleware captura qualquer requisição que não encontrou rota e garante que o erro é JSON
app.use((req, res, next) => {
    const error = new Error(`Não Encontrado: A rota ${req.originalUrl} não existe na API.`);
    error.status = 404;
    next(error); // Passa para o errorHandler
});

// Middleware de Tratamento de Erros (deve ser o último middleware)
app.use(errorHandler);

// Inicia o Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`[Server] Servidor a correr na porta ${PORT}`);
  logger.info(`[Server] Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`[Server] Documentação API disponível em /api-docs`);
});

// Tratamento para Encerramento Gracioso
process.on('SIGINT', async () => {
    logger.info('[Server] Recebido SIGINT. A desligar graciosamente...');
    try {
        await mongoose.connection.close();
        logger.info('[Server] Conexão MongoDB fechada.');
        process.exit(0);
    } catch (err) {
        logger.error('[Server] Erro ao fechar conexão MongoDB durante o encerramento:', err);
        process.exit(1);
    }
});