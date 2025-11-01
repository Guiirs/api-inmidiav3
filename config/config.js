// InMidia/backend/config/config.js
require('dotenv').config();

const config = {
  jwtSecret: process.env.JWT_SECRET,
  // [CORREÇÃO] Mapeia a nova variável de ambiente
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d', // Padrão seguro
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGODB_URI,
  storage: {
    endpoint: process.env.R2_ENDPOINT,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL
  }
};

// Verifica JWT_SECRET
if (!config.jwtSecret) {
    console.error("ERRO FATAL: A variável JWT_SECRET não está definida no ficheiro .env");
    process.exit(1);
}

// Verifica MONGODB_URI
if (!config.mongoUri) {
  console.error("ERRO FATAL: A variável MONGODB_URI não está definida no ficheiro .env");
  process.exit(1);
}

// ... (Verificação do R2 mantida) ...
if (process.env.NODE_ENV === 'production' && (!config.storage.endpoint || !config.storage.accessKeyId || !config.storage.secretAccessKey || !config.storage.bucketName || !config.storage.publicUrl)) {
    console.warn("AVISO: Variáveis de ambiente do R2 (storage) não estão completamente configuradas. Uploads falharão em produção.");
}

module.exports = config;