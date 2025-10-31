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

// --- MELHORIAS (OPERAÇÕES CRUD) ADICIONADAS ---

/**
 * Lista todos os Contratos (com paginação e filtros)
 */
exports.getAllContratos = async (req, res, next) => {
    const empresaId = req.user.empresaId;
    logger.info(`[ContratoController] getAllContratos requisitado por empresa ${empresaId}.`);
    try {
        // Passa os query params (page, limit, status, etc.) para o service
        const result = await contratoService.getAll(empresaId, req.query);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * Busca um Contrato específico pelo ID
 */
exports.getContratoById = async (req, res, next) => {
    const empresaId = req.user.empresaId;
    const { id } = req.params;
    logger.info(`[ContratoController] getContratoById ${id} requisitado por empresa ${empresaId}.`);
    try {
        const contrato = await contratoService.getById(id, empresaId);
        res.status(200).json(contrato);
    } catch (err) {
        next(err);
    }
};

/**
 * Atualiza um Contrato (ex: mudar status de 'rascunho' para 'ativo')
 */
exports.updateContrato = async (req, res, next) => {
    const empresaId = req.user.empresaId;
    const { id } = req.params;
    logger.info(`[ContratoController] updateContrato ${id} requisitado por empresa ${empresaId}.`);
    try {
        // Passa o req.body para o service fazer a atualização segura
        const contratoAtualizado = await contratoService.update(id, req.body, empresaId);
        res.status(200).json(contratoAtualizado);
    } catch (err) {
        next(err);
    }
};

/**
 * Deleta um Contrato (ex: um 'rascunho' incorreto)
 */
exports.deleteContrato = async (req, res, next) => {
    const empresaId = req.user.empresaId;
    const { id } = req.params;
    logger.info(`[ContratoController] deleteContrato ${id} requisitado por empresa ${empresaId}.`);
    try {
        await contratoService.delete(id, empresaId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

// --- FIM DAS MELHORIAS ---


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