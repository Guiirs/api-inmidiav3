// routes/relatoriosRoutes.js
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const authMiddleware = require('../middlewares/authMiddleware'); // Middleware de autenticação

// 1. Importa os controladores necessários
// (Assumindo que o seu 'relatorioController.js' exporta estas funções)
const { 
    getDashboardData, 
    getFaturamentoPorPeriodo 
} = require('../controllers/relatorioController');


// 2. Exporta uma FUNÇÃO que retorna o router (correto)
module.exports = () => {
    
    logger.info('[Routes Relatorios] Definindo rotas de Relatórios...');

    // Rota GET para obter dados agregados para o dashboard
    // Protegida, apenas utilizadores autenticados da empresa podem aceder
    router.get(
        '/dashboard', 
        authMiddleware, 
        getDashboardData
    );
    logger.debug('[Routes Relatorios] Rota GET /dashboard definida.');


    // Rota GET para obter faturamento por período (ex: /api/relatorios/faturamento-periodo?dataInicio=...&dataFim=...)
    // Protegida, apenas utilizadores autenticados
    router.get(
        '/faturamento-periodo',
        authMiddleware,
        getFaturamentoPorPeriodo
    );
    logger.debug('[Routes Relatorios] Rota GET /faturamento-periodo definida.');

    // Outras rotas de relatórios...
    // Ex: router.get('/placas-por-status', authMiddleware, relatorioController.getPlacasPorStatus);

    logger.info('[Routes Relatorios] Rotas de Relatórios definidas com sucesso.');

    return router; // Retorna o router configurado
};