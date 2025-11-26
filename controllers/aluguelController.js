// controllers/aluguelController.js
// const { validationResult } = require('express-validator'); // Não é mais necessário
const AluguelService = require('../services/aluguelService'); 
const logger = require('../config/logger'); 
// const mongoose = require('mongoose'); // Não é mais necessário para validação

// Instancia o serviço
const aluguelService = new AluguelService();

/**
 * Controller para obter o histórico de alugueis de uma placa específica.
 * GET /api/v1/alugueis/placa/:placaId
 */
exports.getAlugueisByPlaca = async (req, res, next) => {
    // [MELHORIA] Remove verificação de autenticação redundante.
    const empresa_id = req.user.empresaId;
    const { placaId } = req.params; 

    logger.info(`[AluguelController] Requisitado getAlugueisByPlaca para placa ${placaId} na empresa ${empresa_id}.`);

    // [MELHORIA] Remove validação manual de ID. Confia que a rota já a executou.

    try {
        const alugueis = await aluguelService.getAlugueisByPlaca(placaId, empresa_id);
        logger.info(`[AluguelController] getAlugueisByPlaca retornou ${alugueis.length} alugueis para placa ${placaId}.`);
        res.status(200).json(alugueis);
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[AluguelController] Erro ao chamar aluguelService.getAlugueisByPlaca: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * Controller para criar um novo aluguel.
 * POST /api/v1/alugueis/
 * [PERÍODO UNIFICADO] Aceita novo formato (periodType, startDate, endDate, biWeekIds) e legado (bi_week_ids, data_inicio, data_fim)
 */
exports.createAluguel = async (req, res, next) => {
    // [MELHORIA] Remove verificação de autenticação redundante.
    const empresa_id = req.user.empresaId;

    logger.info(`[AluguelController] Requisitado createAluguel para empresa ${empresa_id}.`);
    logger.debug(`[AluguelController] Dados recebidos para createAluguel: ${JSON.stringify(req.body)}`);

    // [MELHORIA] Remove verificação de validationResult (agora na rota)

    try {
        // O body já está validado e sanitizado pela rota.
        // [PERÍODO UNIFICADO] PeriodService processa automaticamente no AluguelService
        const novoAluguel = await aluguelService.createAluguel(req.body, empresa_id);
        logger.info(`[AluguelController] createAluguel bem-sucedido. Novo aluguel ID: ${novoAluguel.id}`); 
        res.status(201).json(novoAluguel); 
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[AluguelController] Erro ao chamar aluguelService.createAluguel: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * Controller para apagar (cancelar) um aluguel.
 * DELETE /api/v1/alugueis/:id
 */
exports.deleteAluguel = async (req, res, next) => {
    // [MELHORIA] Remove verificação de autenticação redundante.
    const empresa_id = req.user.empresaId;
    const { id: aluguelId } = req.params; 

    logger.info(`[AluguelController] Requisitado deleteAluguel para ID ${aluguelId} na empresa ${empresa_id}.`);

    // [MELHORIA] Remove validação manual de ID. Confia que a rota já a executou.

    try {
        const result = await aluguelService.deleteAluguel(aluguelId, empresa_id);
        logger.info(`[AluguelController] deleteAluguel para ID ${aluguelId} concluído com sucesso.`);
        // O serviço retorna { success: true, message: '...' } no sucesso (status 200 OK)
        res.status(200).json(result);
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[AluguelController] Erro ao chamar aluguelService.deleteAluguel: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * [BI-WEEK SYNC] Controller para buscar aluguéis por bi-semana
 * GET /api/v1/alugueis/bi-week/:biWeekId
 */
exports.getAlugueisByBiWeek = async (req, res, next) => {
    const empresa_id = req.user.empresaId;
    const { biWeekId } = req.params;

    logger.info(`[AluguelController] Requisitado getAlugueisByBiWeek para bi-semana ${biWeekId} na empresa ${empresa_id}.`);

    try {
        const alugueis = await aluguelService.getAlugueisByBiWeek(biWeekId, empresa_id);
        logger.info(`[AluguelController] ${alugueis.length} aluguéis encontrados para bi-semana ${biWeekId}.`);
        res.status(200).json(alugueis);
    } catch (err) {
        logger.error(`[AluguelController] Erro ao buscar aluguéis por bi-semana: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * [BI-WEEK SYNC] Controller para buscar placas disponíveis em uma bi-semana
 * GET /api/v1/alugueis/bi-week/:biWeekId/disponiveis
 */
exports.getPlacasDisponiveisByBiWeek = async (req, res, next) => {
    const empresa_id = req.user.empresaId;
    const { biWeekId } = req.params;

    logger.info(`[AluguelController] Requisitado getPlacasDisponiveisByBiWeek para bi-semana ${biWeekId} na empresa ${empresa_id}.`);

    try {
        const placas = await aluguelService.getPlacasDisponiveisByBiWeek(biWeekId, empresa_id);
        logger.info(`[AluguelController] ${placas.length} placas disponíveis na bi-semana ${biWeekId}.`);
        res.status(200).json(placas);
    } catch (err) {
        logger.error(`[AluguelController] Erro ao buscar placas disponíveis: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * [BI-WEEK SYNC] Controller para gerar relatório de ocupação por bi-semana
 * GET /api/v1/alugueis/bi-week/:biWeekId/relatorio
 */
exports.getRelatorioOcupacaoBiWeek = async (req, res, next) => {
    const empresa_id = req.user.empresaId;
    const { biWeekId } = req.params;

    logger.info(`[AluguelController] Requisitado getRelatorioOcupacaoBiWeek para bi-semana ${biWeekId} na empresa ${empresa_id}.`);

    try {
        const relatorio = await aluguelService.getRelatorioOcupacaoBiWeek(biWeekId, empresa_id);
        logger.info(`[AluguelController] Relatório gerado para bi-semana ${biWeekId}.`);
        res.status(200).json(relatorio);
    } catch (err) {
        logger.error(`[AluguelController] Erro ao gerar relatório: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};