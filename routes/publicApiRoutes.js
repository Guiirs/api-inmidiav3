// routes/publicApiRoutes.js
const express = require('express');
const router = express.Router();
// const db = require('../config/database'); // <-- Remova esta linha

module.exports = () => {
    const publicApiController = require('../controllers/publicApiController');
    // Chama o middleware diretamente, sem passar 'db'
    const apiKeyAuth = require('../middlewares/apiKeyAuthMiddleware')(); // <-- CORREÇÃO AQUI

    router.use(apiKeyAuth); // Aplica o middleware refatorado

    router.get('/placas/disponiveis', publicApiController.getAvailablePlacas);

    return router;
};