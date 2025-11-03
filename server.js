// server.js
const express = require('express');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet'); // Importa helmet
const swaggerUi = require('swagger-ui-express');
const swaggerConfig = require('./swaggerConfig'); 
const connectDB = require('./config/dbMongo');
const logger = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/AppError');
const scheduleJobs = require('./scripts/updateStatusJob'); // Importa o agendador

// Carrega variáveis de ambiente
require('dotenv').config();

// Conecta à Base de Dados
connectDB();

const app = express();

// --- Middlewares Essenciais ---
app.use(helmet()); // Adiciona headers de segurança
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// --- [CORREÇÃO] Importa a nova rota de registo pública ---
const publicRegisterRoutes = require('./routes/publicRegisterRoutes');
// --- Fim da Correção ---

// Rota de Status (Health Check)
app.get('/api/v1/status', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Rota da Documentação API (Swagger)
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerConfig));


// --- [CORREÇÃO] Define a rota de registo pública (sem /v1) ---
// O front-end chama /api/empresas/register
app.use('/api/empresas', publicRegisterRoutes);
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
// *** CORREÇÃO DA PORTA AQUI ***
// (Se process.env.PORT for fornecido pela Square Cloud, ele será usado. 
// Caso contrário, o fallback agora é 3000, que corresponde ao Dockerfile.)
const PORT = process.env.PORT || 3000;
// *** FIM DA CORREÇÃO ***
const server = http.createServer(app);

server.listen(PORT, () => {
    logger.info(`Servidor a correr em modo ${process.env.NODE_ENV || 'development'} na porta ${PORT}`);
    logger.info(`Documentação da API disponível em http://localhost:${PORT}/api/v1/docs`);
    
    // Inicia os Cron Jobs
    scheduleJobs();
});

// Handle de erros não tratados
process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 A desligar...');
    logger.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});