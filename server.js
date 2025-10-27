// server.js

require('dotenv').config(); // Carrega variáveis de ambiente do .env
const express = require('express');
 // Confia no primeiro hop do proxy (adequado para Square Cloud)

const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerConfig'); // Configuração do Swagger
const connectDB = require('./config/dbMongo'); // Função de conexão com MongoDB
const logger = require('./config/logger'); // Winston logger
const errorHandler = require('./middlewares/errorHandler'); // Middleware de tratamento de erros

// Importação das rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const empresaRoutes = require('./routes/empresaRoutes');
const regiaoRoutes = require('./routes/regiaoRoutes');
const placaRoutes = require('./routes/placas'); // <<< IMPORTAÇÃO DAS ROTAS DE PLACAS
const clienteRoutes = require('./routes/clienteRoutes');
const aluguelRoutes = require('./routes/aluguelRoutes');
const adminRoutes = require('./routes/adminRoutes');
const relatoriosRoutes = require('./routes/relatoriosRoutes');
const publicApiRoutes = require('./routes/publicApiRoutes'); // Rotas da API pública

// Log para depuração da importação de placaRoutes
console.log('--- server.js: placaRoutes importado:', typeof placaRoutes, placaRoutes); // <<< LOG DE DEPURAÇÃO ADICIONADO >>>
logger.info(`[Server] placaRoutes importado. Tipo: ${typeof placaRoutes}`);


// Inicializa a aplicação Express
const app = express();

// Conecta à Base de Dados MongoDB
connectDB();

// Configuração do CORS (ajuste as origens permitidas conforme necessário)
const allowedOrigins = [
    'http://localhost:5500',
    'http://localhost:52946', // Live Server (exemplo)
    'http://127.0.0.1:5500', // Live Server (exemplo)
    'http://localhost:4000',
    'http://localhost:3000', // Frontend em desenvolvimento (ADICIONE SE APLICÁVEL)
    'https://inmidia.squareweb.app', // A sua API (mantém)
    // 'https://SEU_FRONTEND_PUBLICADO.com' // ADICIONE A URL DO FRONTEND PUBLICADO
];
const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem 'origin' (ex: Postman, mobile apps) OU se a origem estiver na lista
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Bloqueada origem não permitida: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Se precisar enviar cookies ou cabeçalhos de autorização
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));


// Middlewares Essenciais
app.set('trust proxy', 1);
app.use(express.json()); // Para fazer parse do body de requisições JSON
app.use(express.urlencoded({ extended: true })); // Para fazer parse de formulários URL-encoded

// Servir ficheiros estáticos (se houver, ex: uploads locais - NÃO RECOMENDADO PARA R2)
// app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Configuração das Rotas da API

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/empresas', empresaRoutes); // Rota pública para registo
app.use('/api/regioes', regiaoRoutes);
app.use('/api/placas', placaRoutes); // <<< USO DAS ROTAS DE PLACAS (Linha 23 nos erros anteriores)
app.use('/api/clientes', clienteRoutes);
app.use('/api/alugueis', aluguelRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/public', publicApiRoutes); // API pública (requer apiKeyAuthMiddleware nas rotas específicas)


// Rota para a documentação Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
logger.info('[Server] Rota /api-docs para Swagger UI configurada.');

// Rota de Teste Simples
app.get('/', (req, res) => {
    res.send('API InMidia está a funcionar!');
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

// Tratamento para Encerramento Gracioso (opcional mas recomendado)
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