// routes/relatoriosRoutes.js
const express = require('express');
const router = express.Router();
const logger = require('../config/logger'); // Importa o logger

// 1. Importe o controlador e o middleware
let relatorioController, authenticateToken;
try {
    relatorioController = require('../controllers/relatorioController');
    authenticateToken = require('../middlewares/authMiddleware');
    logger.info('[Routes Relatorios] Componentes carregados com sucesso.');
} catch (error) {
    logger.error(`[Routes Relatorios] ERRO CRÍTICO ao carregar dependências: ${error.message}`);
    // Se falhar aqui, o controller pode ter um erro de sintaxe
    throw new Error('Falha ao carregar dependências de Relatórios.');
}

// 🐞 CORREÇÃO: As rotas devem ser definidas DENTRO da função exportada
module.exports = () => {
    
    logger.info('[Routes Relatorios] Definindo rotas de Relatórios...');

    // Verificações de integridade
    if (typeof relatorioController.getPlacasPorRegiao !== 'function' || typeof authenticateToken !== 'function') {
        logger.error('[Routes Relatorios] ERRO CRÍTICO: Controllers ou Middleware de Relatorios ausentes.');
        throw new Error('Componentes de Relatórios incompletos ou não exportados.');
    }

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
    
    return router; // Retorna o router configurado
};