// middlewares/sanitizeMiddleware.js
const logger = require('../config/logger');

/**
 * Middleware customizado de sanitização para Express 5
 * Sanitiza req.body e req.params (req.query é read-only no Express 5)
 */
const sanitize = (req, res, next) => {
    // Função para detectar e remover operadores MongoDB
    const sanitizeObject = (obj, path = '') => {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        const keysToCheck = Object.keys(obj);
        
        for (const key of keysToCheck) {
            const currentPath = path ? `${path}.${key}` : key;
            
            // Detecta operadores MongoDB ($, .)
            if (key.startsWith('$') || key.includes('.')) {
                logger.warn(`[Security] Tentativa de NoSQL injection detectada - IP: ${req.ip}, Key: ${currentPath}, Method: ${req.method}, URL: ${req.originalUrl}`);
                
                // Remove a chave perigosa
                delete obj[key];
                continue;
            }
            
            // Recursivamente sanitiza objetos aninhados
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                obj[key] = sanitizeObject(obj[key], currentPath);
            }
        }
        
        return obj;
    };

    try {
        // Sanitiza body
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }

        // Sanitiza params
        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeObject(req.params);
        }

        // Nota: req.query é read-only no Express 5, não podemos sanitizá-lo
        // A validação de query params deve ser feita nos validators das rotas
        
        next();
    } catch (error) {
        logger.error(`[Security] Erro ao sanitizar requisição: ${error.message}`);
        next(error);
    }
};

module.exports = sanitize;
