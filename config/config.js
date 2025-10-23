// InMidia/backend/config/config.js

// Carrega as variáveis de ambiente AQUI PRIMEIRO
require('dotenv').config();

const config = {
  jwtSecret: process.env.JWT_SECRET,
  port: process.env.PORT || 3000,
  
  // --- ADICIONADO PARA O R2 ---
  storage: {
    endpoint: process.env.R2_ENDPOINT,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL // URL pública do bucket (ex: https://pub-xxxx.r2.dev)
  }
  // --- FIM DA ADIÇÃO ---
};

// Adiciona uma verificação de segurança: se a chave não for encontrada, a API não arranca.
if (!config.jwtSecret) {
    console.error("ERRO FATAL: A variável JWT_SECRET não está definida no ficheiro .env");
    process.exit(1);
}

// --- ADICIONADO PARA O R2 ---
// Verificação de segurança para as variáveis de armazenamento
if (process.env.NODE_ENV === 'production' && (!config.storage.endpoint || !config.storage.accessKeyId || !config.storage.secretAccessKey || !config.spons_bucketName || !config.storage.publicUrl)) {
    console.warn("AVISO: Variáveis de ambiente do R2 (storage) não estão completamente configuradas. Uploads falharão em produção.");
    // Você pode tornar isso um erro fatal se preferir:
    // process.exit(1); 
}
// --- FIM DA ADIÇÃO ---


module.exports = config;