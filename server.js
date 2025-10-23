// InMidia/backend/server.js

// Garante que as variáveis de ambiente são carregadas UMA ÚNICA VEZ
require('dotenv').config();
// IMPORTANTE: Importe o express-async-errors AQUI, antes das rotas

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swaggerConfig');

const authMiddleware = require('./middlewares/authMiddleware');
const empresaRoutes = require('./routes/empresaRoutes')();
const authRoutes = require('./routes/auth')();
const placasRoutes = require('./routes/placas')();
const publicApiRoutes = require('./routes/publicApiRoutes')();
// Corrigido o nome do require se o ficheiro foi renomeado
const regiaoRoutes = require('./routes/regiaoRoutes')();
const userRoutes = require('./routes/user')();
const adminRoutes = require('./routes/adminRoutes')();
const relatoriosRoutes = require('./routes/relatoriosRoutes')();
const clienteRoutes = require('./routes/clienteRoutes')(); // <<< ADICIONE ESTA LINHA
const aluguelRoutes = require('./routes/aluguelRoutes')(); // <<< ADICIONE ESTA
const cron = require('node-cron'); // <<< 1. IMPORTE O 'node-cron'

// --- Importe os módulos necessários para o Cron Job ---
const db = require('./config/database'); // <<< 2. IMPORTE O DB
const updatePlacaStatusJob = require('./scripts/updateStatusJob'); // <<< 3. IMPORTE O SCRIPT

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('combined', { stream: logger.stream }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve ficheiros estáticos da pasta de uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Rotas da API e Documentação
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
app.use('/api/v1', publicApiRoutes); // API pública com autenticação por chave
app.use('/empresas', empresaRoutes); // Rota de registo de empresa
app.use('/auth', authRoutes); // Rotas de login e recuperação de senha

// Rotas protegidas por token JWT
app.use('/placas', authMiddleware, placasRoutes);
app.use('/user', authMiddleware, userRoutes);
app.use('/regioes', authMiddleware, regiaoRoutes);
app.use('/admin', authMiddleware, adminRoutes);
app.use('/relatorios', authMiddleware, relatoriosRoutes);
app.use('/clientes', clienteRoutes); // <<< ADICIONE ESTA LINHA (já inclui o authMiddleware)
app.use('/alugueis', aluguelRoutes); // <<< ADICIONE ESTA

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler);

// Inicia o servidor apenas se não estiver em ambiente de teste
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, (err) => {
        if (err) logger.error('❌ Erro ao iniciar o servidor:', err);
        else logger.info(`🚀 Servidor da API rodando em http://localhost:${PORT}`);
    });
}
// --- 4. AGENDAR O CRON JOB ---
    // Agenda a tarefa para rodar todos os dias à 1 da manhã (fuso horário do servidor)
    // (Formato: 'minuto hora dia-do-mês mês dia-da-semana')
    cron.schedule('1 0 * * *', () => {
        logger.info('--- DISPARANDO CRON JOB AGENDADO (1:00 AM) ---');
        updatePlacaStatusJob(db);
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo" // Defina o seu fuso horário
    });
    
    // Opcional: Executa a tarefa uma vez ao iniciar o servidor (para testes)
    logger.info('--- EXECUTANDO CRON JOB NA INICIALIZAÇÃO (TESTE) ---');
    updatePlacaStatusJob(db);
    
// Exporta o app para uso em testes
module.exports = app;