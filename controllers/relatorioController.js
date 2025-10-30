// controllers/relatorioController.js
const { validationResult } = require('express-validator');
const RelatorioService = require('../services/relatorioService'); // Serviço Mongoose
const logger = require('../config/logger'); // Importa o logger

// Instancia o serviço fora da função de criação (padrão preferido)
const relatorioService = new RelatorioService();

/**
 * Controller para gerar um relatório de placas por região.
 */
exports.getPlacasPorRegiao = async (req, res, next) => {
    // Verifica se req.user e req.user.empresaId existem
    if (!req.user || !req.user.empresaId) {
        logger.error('[RelatorioController] getPlacasPorRegiao: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresa_id = req.user.empresaId; // ID da empresa do token (Lê camelCase)
    const userId = req.user.id; // Para logging

    logger.info(`[RelatorioController] Utilizador ${userId} requisitou getPlacasPorRegiao para empresa ${empresa_id}.`);

    try {
        // Chama o serviço refatorado (que executa a agregação)
        const data = await relatorioService.placasPorRegiao(empresa_id); // Passa underscore
        logger.info(`[RelatorioController] getPlacasPorRegiao retornou ${data.length} regiões para empresa ${empresa_id}.`);
        res.status(200).json(data); // Serviço retorna o resultado da agregação
    } catch (err) {
        // Loga o erro recebido do serviço
        logger.error(`[RelatorioController] Erro ao chamar relatorioService.placasPorRegiao: ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (provavelmente 500 ou timeout) vindo do serviço
        next(err);
    }
};

/**
 * Controller para gerar o resumo do dashboard.
 */
exports.getDashboardSummary = async (req, res, next) => {
    // Verifica se req.user e req.user.empresaId existem
    if (!req.user || !req.user.empresaId) {
        logger.error('[RelatorioController] getDashboardSummary: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresa_id = req.user.empresaId; // ID da empresa do token (Lê camelCase)
    const userId = req.user.id;

    logger.info(`[RelatorioController] Utilizador ${userId} requisitou getDashboardSummary para empresa ${empresa_id}.`);

    try {
        // Chama o serviço refatorado
        const summary = await relatorioService.getDashboardSummary(empresa_id); // Passa underscore
        logger.info(`[RelatorioController] getDashboardSummary concluído para empresa ${empresa_id}.`);
        res.status(200).json(summary); // Serviço retorna o objeto de sumário
    } catch (err) {
        // Loga o erro recebido do serviço
        logger.error(`[RelatorioController] Erro ao chamar relatorioService.getDashboardSummary: ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (provavelmente 500 ou timeout) vindo do serviço
        next(err);
    }
};