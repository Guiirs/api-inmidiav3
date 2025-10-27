// routes/publicApiRoutes.js
const express = require('express');
const router = express.Router();
const logger = require('../config/logger'); // Importa o logger

// 1. Importa controladores e middlewares
let publicApiController, apiKeyAuthMiddleware;
try {
    publicApiController = require('../controllers/publicApiController');
    // Chama a função que retorna o middleware (função interna do módulo)
    apiKeyAuthMiddleware = require('../middlewares/apiKeyAuthMiddleware')(); 

    if (typeof publicApiController.getAvailablePlacas !== 'function' || typeof apiKeyAuthMiddleware !== 'function') {
        logger.error('[Routes PublicAPI] ERRO CRÍTICO: Controller ou Middleware de PublicAPI ausentes/inválidos.');
        throw new Error('Componentes de PublicAPI incompletos.');
    }
    logger.info('[Routes PublicAPI] Componentes carregados com sucesso.');
} catch (error) {
    logger.error(`[Routes PublicAPI] ERRO CRÍTICO ao carregar dependências: ${error.message}`);
    throw new Error('Falha ao carregar dependências de PublicAPI.');
}

logger.info('[Routes PublicAPI] Definindo rotas da API Pública...');

module.exports = () => {
    // Aplica o middleware de autenticação por API Key a todas as rotas públicas
    router.use(apiKeyAuthMiddleware);
    logger.debug('[Routes PublicAPI] Middleware de API Key aplicado a /public/*.');

    // Rotas
    router.get('/placas/disponiveis', publicApiController.getAvailablePlacas);
    logger.debug('[Routes PublicAPI] Rota GET /placas/disponiveis definida (Placas Disponíveis).');
    
    logger.info('[Routes PublicAPI] Rotas da API Pública definidas com sucesso.');
    return router;
};