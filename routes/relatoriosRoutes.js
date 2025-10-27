// routes/relatoriosRoutes.js
const express = require('express');
const router = express.Router();
const logger = require('../config/logger'); // Importa o logger

// 1. Importe o controlador e o middleware diretamente
let relatorioController, authenticateToken;
try {
    relatorioController = require('../controllers/relatorioController');
    authenticateToken = require('../middlewares/authMiddleware');
    
    if (typeof relatorioController.getPlacasPorRegiao !== 'function' || typeof authenticateToken !== 'function') {
        logger.error('[Routes Relatorios] ERRO CRÍTICO: Controllers ou Middleware de Relatorios ausentes.');
        throw new Error('Componentes de Relatórios incompletos.');
    }
    logger.info('[Routes Relatorios] Componentes carregados com sucesso.');
} catch (error) {
    logger.error(`[Routes Relatorios] ERRO CRÍTICO ao carregar dependências: ${error.message}`);
    throw new Error('Falha ao carregar dependências de Relatórios.');
}

logger.info('[Routes Relatorios] Definindo rotas de Relatórios...');

module.exports = () => {
    // 1. Rota para o relatório de placas por região
    router.get(
        '/placas-por-regiao',
        authenticateToken, // Aplica autenticação
        relatorioController.getPlacasPorRegiao
    );
    logger.debug('[Routes Relatorios] Rota GET /placas-por-regiao definida (Relatório de Regiões).');
    
    // 2. Rota para o resumo do dashboard
    router.get(
        '/dashboard-summary',
        authenticateToken, // Aplica autenticação
        relatorioController.getDashboardSummary
    );
    logger.debug('[Routes Relatorios] Rota GET /dashboard-summary definida (Sumário do Dashboard).');

    logger.info('[Routes Relatorios] Rotas de Relatórios definidas com sucesso.');
    return router;
};