// middlewares/errorHandler.js
const logger = require('../config/logger'); // Importa o nosso logger

const errorHandler = (err, req, res, next) => {
    // Determina o status padrão e a mensagem genérica
    let status = err.status || 500;
    let message = err.message || 'Ocorreu um erro interno no servidor.';
    let isCritical = status >= 500;
    
    // 1. Trata erros de DUPLICAÇÃO MONGODB (Código 11000)
    if (err.code && err.code === 11000) {
        status = 409; // Conflict
        // Tenta extrair a chave que causou a duplicação
        const field = Object.keys(err.keyValue || {})[0] || 'dados';
        message = `Já existe um registo com estes ${field}.`;
        isCritical = false; // Não é um erro de código, é um erro de negócio/integridade
    } 
    // 2. Trata erros de VALIDAÇÃO Mongoose (ativado por runValidators: true)
    else if (err.name === 'ValidationError' || err.errors) {
        status = 400; // Bad Request
        // Extrai a primeira mensagem de erro detalhada do Mongoose
        const mongooseErrors = Object.values(err.errors || {}).map(e => e.message);
        message = mongooseErrors.join(' ') || 'Erro de validação de dados.';
        isCritical = false;
    }
    // 3. Trata o erro de token (authMiddleware)
    else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
         status = 403;
         message = 'Token inválido ou expirado.';
         isCritical = false;
    } 
    // 4. Trata erros de Negócio ou Não Encontrado (lançados pelos services com status)
    else if (err.status && err.status >= 400 && err.status < 500) {
        status = err.status;
        message = err.message;
        isCritical = false;
    } 
    // 5. Erros Críticos/Inesperados (500)
    else if (isCritical) {
        message = 'Ocorreu um erro interno no servidor.'; // Mensagem genérica para o cliente
    }

    // Loga o erro. Se for crítico (5xx), loga o stack trace e dados adicionais.
    const logDetails = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        body: req.body, // Loga o corpo da requisição (cuidado com senhas em log production)
        stack: isCritical ? err.stack : undefined // Inclui stack apenas para 5xx
    };
    logger.error(`${status} - ${message} - ${req.originalUrl} - ${req.method} - Stack Trace disponível nos logs.`, logDetails);

    // Envia a resposta final para o cliente
    res.status(status).json({ message });
};

module.exports = errorHandler;