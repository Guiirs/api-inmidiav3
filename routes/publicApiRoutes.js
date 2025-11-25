// routes/publicApiRoutes.js
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

// Importa controladores e middleware
const publicApiController = require('../controllers/publicApiController');
const apiKeyAuthMiddleware = require('../middlewares/apiKeyAuthMiddleware');

logger.info('[Routes PublicAPI] Componentes carregados com sucesso.');
logger.info('[Routes PublicAPI] Definindo rotas da API Pública...');

// Aplica o middleware de autenticação por API Key a todas as rotas públicas
router.use(apiKeyAuthMiddleware);
logger.debug('[Routes PublicAPI] Middleware de API Key aplicado a /public/*.');

// Rotas
// GET /api/v1/public/placas/disponiveis
router.get('/placas/disponiveis', publicApiController.getAvailablePlacas);
logger.debug('[Routes PublicAPI] Rota GET /placas/disponiveis definida (Placas Disponíveis).');

logger.info('[Routes PublicAPI] Rotas da API Pública definidas com sucesso.');

// [CORREÇÃO] Exporta o router diretamente em vez de uma função
module.exports = router;
logger.debug('[Routes PublicAPI] Router exportado.');