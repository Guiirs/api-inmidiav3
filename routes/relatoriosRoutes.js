// routes/relatoriosRoutes.js
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const { query } = require('express-validator');
const { handleValidationErrors } = require('../validators/authValidator'); 

// 1. Importe o controlador e o middleware
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

// --- Regras de validação para o período de ocupação (CORRIGIDO) ---
const validateOcupacaoPeriodo = [
    query('data_inicio')
        .notEmpty().withMessage('A data de início é obrigatória.')
        // CORREÇÃO: .toDate() REMOVIDO
        .isISO8601().withMessage('Data de início inválida (formato YYYY-MM-DD).'), 
    
    query('data_fim')
        .notEmpty().withMessage('A data final é obrigatória.')
        // CORREÇÃO: .toDate() REMOVIDO
        .isISO8601().withMessage('Data final inválida (formato YYYY-MM-DD).') 
        .custom((value, { req }) => {
             // A comparação de strings 'YYYY-MM-DD' é segura aqui
             if (!req.query.data_inicio || value < req.query.data_inicio) {
                 throw new Error('A data final deve ser posterior ou igual à data inicial.');
             }
             return true;
         }),
];
// -----------------------------------------------------------


logger.info('[Routes Relatorios] Definindo rotas de Relatórios...');

// Aplica autenticação a todas as rotas do arquivo
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

// 3. Rota para a percentagem de ocupação por período
// GET /api/v1/relatorios/ocupacao-por-periodo?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD
router.get(
    '/ocupacao-por-periodo',
    validateOcupacaoPeriodo,    
    handleValidationErrors,     
    relatorioController.getOcupacaoPorPeriodo 
);
logger.debug('[Routes Relatorios] Rota GET /ocupacao-por-periodo definida (Relatório de Ocupação).');

logger.info('[Routes Relatorios] Rotas de Relatórios definidas com sucesso.');

// Exporta o router
module.exports = router;