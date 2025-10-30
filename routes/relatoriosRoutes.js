// routes/relatoriosRoutes.js
const express = require('express');
const router = express.Router();
// 1. IMPORTAÇÃO ATUALIZADA
const { 
    getDashboardData, 
    getFaturamentoPorPeriodo 
} = require('../controllers/relatorioController');
const authMiddleware = require('../middlewares/authMiddleware'); // Middleware de autenticação
const adminAuthMiddleware = require('../middlewares/adminAuthMiddleware'); // Middleware de admin (se necessário)
const logger = require('../config/logger');

logger.info('[Routes Relatorios] Definindo rotas de Relatórios...');

// Rota GET para obter dados agregados para o dashboard
// Protegida, apenas utilizadores autenticados da empresa podem aceder
router.get(
    '/dashboard', 
    authMiddleware, 
    getDashboardData
);
logger.debug('[Routes Relatorios] Rota GET /dashboard definida.');


// --- 2. NOVA ROTA ADICIONADA ---

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

module.exports = () => router; // Exporta uma função que retorna o router