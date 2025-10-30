// controllers/relatorioController.js
const { validationResult } = require('express-validator');
const RelatorioService = require('../services/relatorioService'); 
const logger = require('../config/logger'); 
// Não é necessário importar AppError aqui, ele deve ser tratado pelo next(err)

// Instancia o serviço
const relatorioService = new RelatorioService();

/**
 * Controller para gerar um relatório de placas por região.
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
 * Controller para gerar o resumo do dashboard.
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
 * Controller para obter a percentagem de ocupação das placas por período.
 * GET /api/v1/relatorios/ocupacao-por-periodo?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD
 */
exports.getOcupacaoPorPeriodo = async (req, res, next) => {
    const empresa_id = req.user.empresaId; 
    const userId = req.user.id;

    logger.info(`[RelatorioController] Utilizador ${userId} requisitou getOcupacaoPorPeriodo para empresa ${empresa_id}.`);
    
    // 1. Verifica erros de validação (express-validator)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array({ onlyFirstError: true })[0].msg;
        logger.warn(`[RelatorioController] Ocupacao falhou: Erro de validação: ${firstError}`);
        return res.status(400).json({ message: firstError });
    }

    // 2. Extrai as strings de data
    const dataInicioString = req.query.data_inicio;
    const dataFimString = req.query.data_fim;
    
    // 3. CORREÇÃO: Converte explicitamente para objetos Date (início do dia)
    const dataInicio = new Date(dataInicioString);
    const dataFim = new Date(dataFimString);
    
    // Validação de segurança extra
    if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
         return res.status(400).json({ message: 'As datas fornecidas são inválidas após a conversão.' });
    }

    try {
        // 4. Chama o serviço com os objetos Date
        const result = await relatorioService.ocupacaoPorPeriodo(empresa_id, dataInicio, dataFim);
        logger.info(`[RelatorioController] getOcupacaoPorPeriodo concluído. Ocupação: ${result.percentagem}%.`);
        res.status(200).json(result); 
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[RelatorioController] Erro ao chamar relatorioService.ocupacaoPorPeriodo: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};