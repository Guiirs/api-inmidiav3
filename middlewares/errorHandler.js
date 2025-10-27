// middlewares/errorHandler.js
const logger = require('../config/logger'); // Importa o nosso logger

const errorHandler = (err, req, res, next) => {
    let status = err.status || 500;
    let message = err.message || 'Ocorreu um erro interno no servidor.';
    let isCritical = status >= 500;

    // Tratamento específico de erros (mantido)
    if (err.code && err.code === 11000) {
        status = 409; 
        const field = Object.keys(err.keyValue || {})[0] || 'dados';
        message = `Já existe um registo com estes ${field}.`;
        isCritical = false;
    } else if (err.name === 'ValidationError' || err.errors) {
        status = 400; 
        const mongooseErrors = Object.values(err.errors || {}).map(e => e.message);
        message = mongooseErrors.join(' ') || 'Erro de validação de dados.';
        isCritical = false;
    } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
         status = 403;
         message = 'Token inválido ou expirado.';
         isCritical = false;
    } else if (err.status && err.status >= 400 && err.status < 500) {
        status = err.status;
        message = err.message;
        isCritical = false;
    } else if (isCritical) {
        message = 'Ocorreu um erro interno no servidor.'; 
    }

    // <<< REFORÇO DO LOGGING >>>
    // Loga a mensagem principal
    logger.error(`${status} - ${message} - ${req.originalUrl} - ${req.method} - IP: ${req.ip}`);
    
    // Loga o objeto de erro completo E o stack trace SEPARADAMENTE para garantir visibilidade
    // (A formatação padrão do Winston pode esconder o stack em alguns transportes)
    if (err) {
         logger.error("Objeto de Erro Completo:", err); 
         if (err.stack) {
             logger.error("Stack Trace Detalhado:\n", err.stack);
         }
    }
    // <<< FIM DO REFORÇO >>>

    // Envia a resposta final para o cliente
    res.status(status).json({ message });
};

module.exports = errorHandler;