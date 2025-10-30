// controllers/relatorioController.js
const RelatorioService = require('../services/relatorioService'); // Serviço Mongoose
const logger = require('../config/logger'); // Importa o logger

// Instancia o serviço fora da função de criação
const relatorioService = new RelatorioService();

/**
 * Controller para gerar um relatório de placas por região.
 * GET /api/v1/relatorios/placas-por-regiao
 */
exports.getPlacasPorRegiao = async (req, res, next) => {
    // [MELHORIA] Confia no authMiddleware
    const empresa_id = req.user.empresaId; // ID da empresa do token
    const userId = req.user.id; // Para logging

    logger.info(`[RelatorioController] Utilizador ${userId} requisitou getPlacasPorRegiao para empresa ${empresa_id}.`);

    try {
        // Chama o serviço
        const data = await relatorioService.placasPorRegiao(empresa_id);
        logger.info(`[RelatorioController] getPlacasPorRegiao retornou ${data.length} regiões para empresa ${empresa_id}.`);
        res.status(200).json(data); // Serviço retorna o resultado da agregação
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[RelatorioController] Erro ao chamar relatorioService.placasPorRegiao: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * Controller para gerar o resumo do dashboard.
 * GET /api/v1/relatorios/dashboard-summary
 */
exports.getDashboardSummary = async (req, res, next) => {
    // [MELHORIA] Confia no authMiddleware
    const empresa_id = req.user.empresaId; // ID da empresa do token
    const userId = req.user.id;

    logger.info(`[RelatorioController] Utilizador ${userId} requisitou getDashboardSummary para empresa ${empresa_id}.`);

    try {
        // Chama o serviço
        const summary = await relatorioService.getDashboardSummary(empresa_id);
        logger.info(`[RelatorioController] getDashboardSummary concluído para empresa ${empresa_id}.`);
        res.status(200).json(summary); // Serviço retorna o objeto de sumário
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[RelatorioController] Erro ao chamar relatorioService.getDashboardSummary: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};