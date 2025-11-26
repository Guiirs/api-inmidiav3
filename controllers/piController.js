// controllers/piController.js
const PIService = require('../services/piService');
const logger = require('../config/logger');

const piService = new PIService();

// Cria PI
// [PERÍODO UNIFICADO] Aceita novo formato (periodType, startDate, endDate, biWeekIds) e legado (tipoPeriodo, dataInicio, dataFim)
exports.createPI = async (req, res, next) => {
    const empresaId = req.user.empresaId;
    logger.info(`[PiController] createPI requisitado por empresa ${empresaId}.`);
    logger.debug(`[PiController] req.body recebido: ${JSON.stringify(req.body, null, 2)}`);
    logger.debug(`[PiController] Placas recebidas: ${JSON.stringify(req.body.placas)}`);
    
    try {
        const piData = { ...req.body, cliente: req.body.clienteId }; // Ajusta o nome do campo
        logger.debug(`[PiController] piData que será enviado ao service: ${JSON.stringify(piData, null, 2)}`);
        
        // [PERÍODO UNIFICADO] PeriodService processa automaticamente no PIService
        const novaPI = await piService.create(piData, empresaId);
        
        logger.info(`[PiController] PI criada com sucesso. ID: ${novaPI._id}, Placas: ${novaPI.placas?.length || 0}`);
        
        res.status(201).json(novaPI);
    } catch (err) {
        logger.error(`[PiController] Erro ao criar PI: ${err.message}`, { stack: err.stack });
        next(err);
    }
};

// Lista PIs
exports.getAllPIs = async (req, res, next) => {
    const empresaId = req.user.empresaId;
    logger.info(`[PiController] getAllPIs requisitado por empresa ${empresaId}.`);
    try {
        const result = await piService.getAll(empresaId, req.query);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

// Busca PI por ID
exports.getPIById = async (req, res, next) => {
    const empresaId = req.user.empresaId;
    const { id } = req.params;
    logger.info(`[PiController] getPIById ${id} requisitado por empresa ${empresaId}.`);
    try {
        const pi = await piService.getById(id, empresaId);
        res.status(200).json(pi);
    } catch (err) {
        next(err);
    }
};

// Atualiza PI
// [PERÍODO UNIFICADO] Aceita novos campos de período
exports.updatePI = async (req, res, next) => {
    const empresaId = req.user.empresaId;
    const { id } = req.params;
    logger.info(`[PiController] updatePI ${id} requisitado por empresa ${empresaId}.`);
    try {
        const piData = { ...req.body, cliente: req.body.clienteId };
        // [PERÍODO UNIFICADO] PeriodService processa automaticamente no PIService se período atualizado
        const piAtualizada = await piService.update(id, piData, empresaId);
        res.status(200).json(piAtualizada);
    } catch (err) {
        next(err);
    }
};

// Deleta PI
exports.deletePI = async (req, res, next) => {
    const empresaId = req.user.empresaId;
    const { id } = req.params;
    logger.info(`[PiController] deletePI ${id} requisitado por empresa ${empresaId}.`);
    try {
        await piService.delete(id, empresaId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

// Download PDF da PI
exports.downloadPI_PDF = async (req, res, next) => {
    const empresaId = req.user.empresaId;
    const userId = req.user.id;
    const { id } = req.params;
    logger.info(`[PiController] downloadPI_PDF ${id} requisitado por user ${userId} (Empresa ${empresaId}).`);
    try {
        // Passamos o 'res' para o serviço fazer o streaming do PDF
        await piService.generatePDF(id, empresaId, userId, res);
    } catch (err) {
        next(err);
    }
};