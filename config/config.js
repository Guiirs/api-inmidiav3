// InMidia/backend/config/config.js

// Carrega as variáveis de ambiente AQUI PRIMEIRO
require('dotenv').config();

const config = {
  jwtSecret: process.env.JWT_SECRET,
  port: process.env.PORT || 3000,
};

// Adiciona uma verificação de segurança: se a chave não for encontrada, a API não arranca.
if (!config.jwtSecret) {
    console.error("ERRO FATAL: A variável JWT_SECRET não está definida no ficheiro .env");
    process.exit(1);
}

module.exports = config;