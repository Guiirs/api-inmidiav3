// middlewares/errorHandler.js
const logger = require('../config/logger'); // Importa o nosso novo logger

const errorHandler = (err, req, res, next) => {
    // --- MELHORIA APLICADA AQUI ---
    // Loga o erro com o nível 'error'
    logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ message: 'Já existe um registo com estes dados.' });
    }

    if (err.errors) {
        return res.status(400).json({ message: 'Erro de validação.', errors: err.errors });
    }

    if (err.status) {
        return res.status(err.status).json({ message: err.message || 'Ocorreu um erro.' });
    }
    
    const status = 500;
    const message = 'Ocorreu um erro interno no servidor.';
    
    res.status(status).json({ message });
};

module.exports = errorHandler;