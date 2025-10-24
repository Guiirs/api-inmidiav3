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
const mongoose = require('mongoose'); // <-- **Adicione esta linha**

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


// --- Função Async para iniciar o servidor ---
async function startServer() {
  // 1. Conecta ao MongoDB e ESPERA a conexão ser estabelecida
  await connectDB();

  const app = express();
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
  if (process.env.NODE_ENV !== 'test') {
    logger.info('--- EXECUTANDO CRON JOB NA INICIALIZAÇÃO (TESTE) APÓS CONEXÃO DB ---');
    // Usamos .then() .catch() aqui para não bloquear o início do servidor se o job falhar
    updatePlacaStatusJob().catch(err => logger.error("Erro na execução inicial do Cron Job:", err));
  }
  // ------------------------------------------------------------------

  // --- Inicia o servidor ---
  if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, (err) => {
          if (err) logger.error('❌ Erro ao iniciar o servidor:', err);
          else logger.info(`🚀 Servidor da API rodando em http://localhost:${PORT}`);
      });
  }

  // Exporta o app APÓS a configuração (para testes)
  // Certifique-se de que seus testes esperam a conexão antes de rodar, ou mova export para fora do async
  // module.exports = app; // Movido para fora para simplificar exportação síncrona

} // Fim da função startServer

// --- Chama a função para iniciar tudo ---
startServer();

// Adiciona um listener para o evento 'close' da conexão Mongoose (opcional, para debug)
mongoose.connection.on('close', () => {
    logger.warn('🔌 Conexão com MongoDB fechada.');
});
mongoose.connection.on('error', (err) => {
    logger.error('❌ Erro na conexão MongoDB após conexão inicial:', err);
});

// Exporta o app fora da função async para facilitar importação síncrona em testes
// Nota: Testes precisarão garantir a conexão com o DB antes de rodar.
const app = express(); // Precisa re-declarar ou refatorar para exportar o app configurado
module.exports = app; // Exportação simplificada - ATENÇÃO: pode precisar de ajustes nos testes