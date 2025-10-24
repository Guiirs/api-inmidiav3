// InMidia/backend/server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swaggerConfig');
const cron = require('node-cron');
const mongoose = require('mongoose');

const connectDB = require('./config/dbMongo'); // Importa a conexão MongoDB
const updatePlacaStatusJob = require('./scripts/updateStatusJob'); // Importa o script Mongoose

// --- Importações de Rotas ---
const authMiddleware = require('./middlewares/authMiddleware');
// ... (resto das importações de rotas)
const empresaRoutes = require('./routes/empresaRoutes')();
const authRoutes = require('./routes/auth')();
const placasRoutes = require('./routes/placas')();
const publicApiRoutes = require('./routes/publicApiRoutes')();
const regiaoRoutes = require('./routes/regiaoRoutes')();
const userRoutes = require('./routes/user')();
const adminRoutes = require('./routes/adminRoutes')();
const relatoriosRoutes = require('./routes/relatoriosRoutes')();
const clienteRoutes = require('./routes/clienteRoutes')();
const aluguelRoutes = require('./routes/aluguelRoutes')();

const app = express(); // Cria a instância do app ANTES da função async
const PORT = process.env.PORT || 3000;

// --- Configuração do Express (middlewares) ---
app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('combined', { stream: logger.stream }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Rotas Estáticas e de API ---
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
app.use('/api/v1', publicApiRoutes);
app.use('/empresas', empresaRoutes);
app.use('/auth', authRoutes);
app.use('/placas', authMiddleware, placasRoutes);
app.use('/user', authMiddleware, userRoutes);
app.use('/regioes', authMiddleware, regiaoRoutes);
app.use('/admin', authMiddleware, adminRoutes);
app.use('/relatorios', authMiddleware, relatoriosRoutes);
app.use('/clientes', clienteRoutes);
app.use('/alugueis', aluguelRoutes);

// --- Error Handler (último middleware) ---
app.use(errorHandler);


// --- Função Async para iniciar o servidor E CONECTAR AO DB ---
async function startServerAndConnectDb() {
  // 1. Conecta ao MongoDB e ESPERA a conexão ser estabelecida
  await connectDB();

  // --- Cron Job (Configurado APÓS a conexão DB estar pronta) ---
  cron.schedule('1 0 * * *', () => {
      logger.info('--- DISPARANDO CRON JOB AGENDADO (1:00 AM) ---');
      updatePlacaStatusJob(); // Chama a função Mongoose
  }, {
      scheduled: true,
      timezone: "America/Sao_Paulo"
  });
  logger.info('[CRON JOB] Tarefa de atualização de status agendada para 01:00 AM (America/Sao_Paulo).');

  // Opcional: Executa a tarefa uma vez ao iniciar (AGORA que a DB está conectada)
  logger.info('--- EXECUTANDO CRON JOB NA INICIALIZAÇÃO (TESTE) APÓS CONEXÃO DB ---');
  updatePlacaStatusJob().catch(err => logger.error("Erro na execução inicial do Cron Job:", err));
  // ------------------------------------------------------------------

  // --- Inicia o servidor (ouve a porta) ---
  app.listen(PORT, (err) => {
      if (err) logger.error('❌ Erro ao iniciar o servidor:', err);
      else logger.info(`🚀 Servidor da API rodando em http://localhost:${PORT}`);
  });

} // Fim da função startServerAndConnectDb


// --- Condicional para iniciar a conexão e o servidor ---
// Só conecta e escuta a porta se NÃO estiver em ambiente de teste
if (process.env.NODE_ENV !== 'test') {
    startServerAndConnectDb(); // Chama a função para conectar e iniciar
}
// ----------------------------------------------------


// Adiciona listeners de conexão (fora da função async)
mongoose.connection.on('close', () => {
    logger.warn('🔌 Conexão com MongoDB fechada.');
});
mongoose.connection.on('error', (err) => {
    logger.error('❌ Erro na conexão MongoDB após conexão inicial:', err);
});

// Exporta o app configurado para ser usado pelos testes (ou noutros locais)
module.exports = app;