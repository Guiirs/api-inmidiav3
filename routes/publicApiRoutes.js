// routes/publicApiRoutes.js
const express = require('express');
const router = express.Router();
// 1. Importe a instância do banco de dados
const db = require('../config/database');

module.exports = () => {
    // 2. Importe os módulos necessários
    const publicApiController = require('../controllers/publicApiController');
    // 3. Passe a instância 'db' ao chamar o middleware
    const apiKeyAuth = require('../middlewares/apiKeyAuthMiddleware')(db); // <<< CORREÇÃO AQUI

    // Todas as rotas neste ficheiro são protegidas pela chave de API
    router.use(apiKeyAuth);

    // Endpoint para obter as placas disponíveis
    // Ex: GET /api/v1/placas/disponiveis
    router.get('/placas/disponiveis', publicApiController.getAvailablePlacas);

    return router;
};