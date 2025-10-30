// controllers/relatorioController.js
const { validationResult } = require('express-validator');
const RelatorioService = require('../services/relatorioService'); // Importa o Serviço
const logger = require('../config/logger'); 
// const AppError = require('../utils/AppError'); // Não precisa ser importado aqui

// Instancia o serviço
const relatorioService = new RelatorioService();

/**
 * Controller para gerar um relatório de placas por região.
 * GET /api/v1/relatorios/placas-por-regiao
 */
exports.getPlacasPorRegiao = async (req, res, next) => {
    // [MELHORIA] Confia no authMiddleware
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
 * GET /api/v1/relatorios/dashboard-summary
 */
exports.getDashboardSummary = async (req, res, next) => {
    // [MELHORIA] Confia no authMiddleware
    const empresa_id = req.user.empresaId; 
    const userId = req.user.id;

    logger.info(`[RelatorioController] Utilizador ${userId} requisitou getDashboardSummary para empresa ${empresa_id}.`);

    try {
        // Assume que existe um método getDashboardSummary no service
        const summary = await relatorioService.getDashboardSummary(empresa_id);
        logger.info(`[RelatorioController] getDashboardSummary concluído para empresa ${empresa_id}.`);
        res.status(200).json(summary); 
    } catch (err) {
        logger.error(`[RelatorioController] Erro ao chamar relatorioService.getDashboardSummary: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * Controller para obter a percentagem de ocupação por período.
 * GET /api/v1/relatorios/ocupacao-por-periodo?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD
 */
exports.getOcupacaoPorPeriodo = async (req, res, next) => {
    const empresa_id = req.user.empresaId; 
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const firstError = errors.array({ onlyFirstError: true })[0].msg;
        logger.warn(`[RelatorioController] Requisição de Ocupação falhou: Erro de validação: ${firstError}`);
        return res.status(400).json({ message: firstError });
    }

    // [CORREÇÃO] Converte explicitamente para objetos Date
    const dataInicio = new Date(req.query.data_inicio);
    const dataFim = new Date(req.query.data_fim);

    if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
        return res.status(400).json({ message: 'Datas de período inválidas.' });
    }

    try {
        const reportData = await relatorioService.ocupacaoPorPeriodo(empresa_id, dataInicio, dataFim);
        res.status(200).json(reportData);
    } catch (err) {
        logger.error(`[RelatorioController] Erro ao obter ocupação por período: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};


/**
 * [NOVO CONTROLLER] Controller para gerar e exportar o relatório de ocupação como PDF via API Externa.
 * GET /api/v1/relatorios/export/ocupacao-por-periodo?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD
 */
exports.exportOcupacaoPdf = async (req, res, next) => {
    const empresa_id = req.user.empresaId; 
    const userId = req.user.id;

    logger.info(`[RelatorioController] Utilizador ${userId} requisitou exportação PDF de Ocupação.`);

    // 1. Verifica erros de validação (express-validator na rota já garante datas)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array({ onlyFirstError: true })[0].msg;
        return res.status(400).json({ message: firstError });
    }

    // 2. Converte explicitamente para objetos Date (início do dia)
    const dataInicio = new Date(req.query.data_inicio);
    const dataFim = new Date(req.query.data_fim);

    if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
         return res.status(400).json({ message: 'Datas de período inválidas.' });
    }

    try {
        // 3. Obtém os dados completos do relatório
        const reportData = await relatorioService.ocupacaoPorPeriodo(empresa_id, dataInicio, dataFim);

        // 4. Chama o serviço para gerar o PDF via API Externa e enviar para a resposta HTTP
        await relatorioService.generateOcupacaoPdf(reportData, dataInicio, dataFim, res);
        
        // O res.send() final é feito dentro do Service após a resposta da API externa.
    } catch (err) {
        logger.error(`[RelatorioController] Erro ao exportar PDF: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};