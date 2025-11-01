// controllers/empresaController.js
const EmpresaService = require('../services/empresaService');
const logger = require('../config/logger');

// GET /empresa/api-key
exports.getApiKey = async (req, res, next) => {
    try {
        const empresaId = req.user.empresaId;
        const apiKey = await EmpresaService.getApiKey(empresaId);
        res.status(200).json({ apiKey });
    } catch (err) {
        next(err);
    }
};

// POST /empresa/api-key
exports.regenerateApiKey = async (req, res, next) => {
    try {
        const empresaId = req.user.empresaId;
        const userId = req.user.id;
        // const { password } = req.body; (Lógica de password removida)

        const novaChave = await EmpresaService.regenerateApiKey(userId, empresaId);
        res.status(200).json({ apiKey: novaChave });
    } catch (err) {
        next(err);
    }
};

// --- FUNÇÕES NOVAS ADICIONADAS AQUI ---

// GET /empresa/details
exports.getEmpresaDetails = async (req, res, next) => {
    try {
        const empresaId = req.user.empresaId;
        const detalhes = await EmpresaService.getEmpresaDetailsById(empresaId);
        res.status(200).json(detalhes);
    } catch (err) {
        next(err);
    }
};

// PUT /empresa/details
exports.updateEmpresaDetails = async (req, res, next) => {
    try {
        const empresaId = req.user.empresaId;
        // req.body já foi validado pelo 'updateEmpresaRules'
        const empresaAtualizada = await EmpresaService.updateEmpresaDetails(empresaId, req.body);
        res.status(200).json(empresaAtualizada);
    } catch (err) {
        next(err);
    }
};