// routes/relatoriosRoutes.js
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

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

// [MELHORIA] Aplica autenticação a todas as rotas do arquivo
router.use(authenticateToken);
logger.debug('[Routes Relatorios] Middleware de Autenticação aplicado a todas as rotas.');

// 1. Rota para o relatório de placas por região
// GET /api/v1/relatorios/placas-por-regiao
router.get(
    '/placas-por-regiao',
    relatorioController.getPlacasPorRegiao
);
logger.debug('[Routes Relatorios] Rota GET /placas-por-regiao definida (Relatório de Regiões).');

// 2. Rota para o resumo do dashboard
// GET /api/v1/relatorios/dashboard-summary
router.get(
    '/dashboard-summary',
    relatorioController.getDashboardSummary
);
logger.debug('[Routes Relatorios] Rota GET /dashboard-summary definida (Sumário do Dashboard).');

logger.info('[Routes Relatorios] Rotas de Relatórios definidas com sucesso.');

// [CORREÇÃO] Exporta o router diretamente
module.exports = router;
logger.debug('[Routes Relatorios] Router exportado.');