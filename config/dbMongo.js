// config/dbMongo.js
const mongoose = require('mongoose');
const config = require('./config'); // Puxa MONGODB_URI de config.js
const logger = require('./logger'); // Usa seu logger existente

const connectDB = async () => {
  try {
    // Tenta conectar usando a URI do config
    await mongoose.connect(config.mongoUri, {
      // Opções podem ser necessárias dependendo da versão, mas as mais recentes tendem a não precisar
      // useNewUrlParser: true, // Deprecated em versões recentes
      // useUnifiedTopology: true, // Deprecated em versões recentes
    });
    logger.info('🔌 Conexão com MongoDB estabelecida.'); // Log de sucesso

  } catch (err) {
    // Loga o erro e encerra a aplicação se a conexão falhar
    logger.error('❌ Erro ao conectar com MongoDB:', err.message);
    process.exit(1); // Sai com código de erro
  }
};

module.exports = connectDB; // Exporta a função de conexão