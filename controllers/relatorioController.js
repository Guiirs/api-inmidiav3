// controllers/relatorioController.js
// [MELHORIA] Importa validationResult (necessário para validação de query)
const { validationResult } = require('express-validator');
const RelatorioService = require('../services/relatorioService'); 
const logger = require('../config/logger'); 

// Instancia o serviço
const relatorioService = new RelatorioService();

/**
 * Controller para gerar um relatório de placas por região. (Mantido)
 */
exports.getPlacasPorRegiao = async (req, res, next) => {
    const empresa_id = req.user.empresaId; 
    const userId = req.user.id; 

    logger.info(`[RelatorioController] Utilizador ${userId} requisitou getPlacasPorRegiao para empresa ${empresa_id}.`);

    try {
        const data = await relatorioService.placasPorRegiao(empresa_id);
        logger.info(`[RelatorioController] getPlacasPorRegiao retornou ${data.length} regiões para empresa ${empresa_id}.`);
        res.status(200).json(data); 
    } catch (err) {
        logger.error(`[RelatorioController] Erro ao chamar relatorioService.placasPorRegiao: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * Controller para gerar o resumo do dashboard. (Mantido)
 */
exports.getDashboardSummary = async (req, res, next) => {
    const empresa_id = req.user.empresaId; 
    const userId = req.user.id;

    logger.info(`[RelatorioController] Utilizador ${userId} requisitou getDashboardSummary para empresa ${empresa_id}.`);

    try {
        const summary = await relatorioService.getDashboardSummary(empresa_id);
        logger.info(`[RelatorioController] getDashboardSummary concluído para empresa ${empresa_id}.`);
        res.status(200).json(summary); 
    } catch (err) {
        logger.error(`[RelatorioController] Erro ao chamar relatorioService.getDashboardSummary: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * [NOVO CONTROLLER] Controller para obter a percentagem de ocupação das placas por período.
 * GET /api/v1/relatorios/ocupacao-por-periodo?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD
 */
exports.getOcupacaoPorPeriodo = async (req, res, next) => {
    // 1. Confia no authMiddleware
    const empresa_id = req.user.empresaId; 
    const userId = req.user.id;

    logger.info(`[RelatorioController] Utilizador ${userId} requisitou getOcupacaoPorPeriodo para empresa ${empresa_id}.`);
    
    // 2. Validação dos query params (feita na rota, mas re-obtida aqui)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array({ onlyFirstError: true })[0].msg;
        logger.warn(`[RelatorioController] Ocupacao falhou: Erro de validação: ${firstError}`);
        // Retorna 400 Bad Request
        return res.status(400).json({ message: firstError });
    }

    // 3. Extrai as datas (já convertidas para Date object na rota)
    const { data_inicio, data_fim } = req.query; 

    try {
        // 4. Chama o serviço
        const result = await relatorioService.ocupacaoPorPeriodo(empresa_id, data_inicio, data_fim);
        logger.info(`[RelatorioController] getOcupacaoPorPeriodo concluído. Ocupação: ${result.percentagem}%.`);
        res.status(200).json(result); 
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[RelatorioController] Erro ao chamar relatorioService.ocupacaoPorPeriodo: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};