// controllers/contratoController.js
const ContratoService = require('../services/contratoService');
const logger = require('../config/logger');

const contratoService = new ContratoService();

// Cria Contrato
exports.createContrato = async (req, res, next) => {
    const empresaId = req.user.empresaId;
    const { piId } = req.body;
    logger.info(`[ContratoController] createContrato requisitado para PI ${piId} (Empresa ${empresaId}).`);
    try {
        const novoContrato = await contratoService.create(piId, empresaId);
        res.status(201).json(novoContrato);
    } catch (err) {
        next(err);
    }
};

// Download PDF do Contrato
exports.downloadContrato_PDF = async (req, res, next) => {
    const empresaId = req.user.empresaId;
    const { id } = req.params; // ID do Contrato
    logger.info(`[ContratoController] downloadContrato_PDF ${id} requisitado por empresa ${empresaId}.`);
    try {
        await contratoService.generatePDF(id, empresaId, res);
    } catch (err) {
        next(err);
    }
};