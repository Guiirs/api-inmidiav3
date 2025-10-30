// middlewares/errorHandler.js
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

/**
 * Converte erros de Cast (ID inválido) do Mongoose em um AppError operacional.
 */
const handleCastErrorDB = (err) => {
    const message = `Recurso inválido. ${err.path}: ${err.value}.`;
    return new AppError(message, 400); // 400 Bad Request
};

/**
 * Converte erros de chave duplicada (11000) do Mongoose em um AppError operacional.
 */
const handleDuplicateFieldsDB = (err) => {
    // Extrai o valor do erro
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `O campo '${field}' com valor '${value}' já existe. Por favor, use outro valor.`;
    return new AppError(message, 409); // 409 Conflict
};

/**
 * Converte erros de validação do Mongoose em um AppError operacional.
 */
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Dados de entrada inválidos: ${errors.join('. ')}`;
    return new AppError(message, 400); // 400 Bad Request
};

/**
 * Converte erros de JWT (token inválido).
 */
const handleJWTError = () => new AppError('Token inválido. Por favor, faça login novamente.', 401); // 401 Unauthorized

/**
 * Converte erros de JWT (token expirado).
 */
const handleJWTExpiredError = () => new AppError('O seu token expirou. Por favor, faça login novamente.', 401); // 401 Unauthorized

/**
 * Envia uma resposta de erro detalhada (para ambiente de desenvolvimento).
 */
const sendErrorDev = (err, req, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        error: err,
        stack: err.stack,
        // Mantém a exibição de erros de validação específicos, se existirem
        validationErrors: err.validationErrors
    });
};

/**
 * Envia uma resposta de erro controlada (para ambiente de produção).
 * Só vaza detalhes de erros operacionais (AppError).
 */
const sendErrorProd = (err, res) => {
    // A) Erro Operacional (confiável, vindo de um AppError): Envia mensagem ao cliente
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            // Adiciona erros de validação (ex: do express-validator) se existirem
            ...(err.validationErrors && { errors: err.validationErrors })
        });
    } 
    // B) Erro de programação ou desconhecido: Não vaza detalhes
    else {
        // 1. Loga o erro (já foi logado antes, mas garantimos aqui)
        logger.error('ERRO NÃO OPERACIONAL 💥 (PRODUÇÃO)', { 
            message: err.message, 
            stack: err.stack, 
            errorObject: err 
        });

        // 2. Envia resposta genérica
        res.status(500).json({
            status: 'error',
            message: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.'
        });
    }
};

/**
 * Middleware Global de Tratamento de Erros.
 */
module.exports = (err, req, res, next) => {
    // Define valores padrão para o erro, caso não venham
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // [MELHORIA] Log centralizado
    // Loga todos os erros (operacionais ou não) assim que chegam.
    // O log original era bom, 
    // mas agora está no topo.
    logger.error(
        `${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - IP: ${req.ip}`,
        // Inclui o stack trace no log (não na resposta ao cliente)
        { stack: err.stack } 
    );

    // [MELHORIA] Distingue resposta de Dev e Prod
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else { // 'production' ou qualquer outro
        
        // Em produção, primeiro tentamos converter erros técnicos
        // em erros operacionais (AppError) para uma resposta limpa.
        
        // Copiamos o erro para não modificar o original
        let error = { ...err, message: err.message, name: err.name, code: err.code, keyValue: err.keyValue };

        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
        
        // Se o erro veio do express-validator (passado via AppError)
        // garantimos que ele seja marcado como operacional.
        if (err.validationErrors) {
            error.validationErrors = err.validationErrors;
            error.isOperational = true;
        }

        sendErrorProd(error, res);
    }
};