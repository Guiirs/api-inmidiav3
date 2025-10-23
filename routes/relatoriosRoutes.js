// routes/relatoriosRoutes.js
const express = require('express');
const router = express.Router();

// 1. Importe o controlador e o middleware diretamente
const relatorioController = require('../controllers/relatorioController');
const authenticateToken = require('../middlewares/authMiddleware');

// 2. A exportação do módulo já não precisa de parâmetros
module.exports = () => {
    // 3. Use o middleware como uma variável (referência), não o execute com ()
    router.get(
        '/placas-por-regiao',
        authenticateToken, // <-- CORRIGIDO
        relatorioController.getPlacasPorRegiao
    );
    // --- NOVA ROTA ADICIONADA AQUI ---
    router.get('/dashboard-summary', relatorioController.getDashboardSummary);

    return router;
};