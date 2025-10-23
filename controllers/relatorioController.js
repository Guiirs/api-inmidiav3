// InMidia/backend/controllers/relatorioController.js

const db = require('../config/database');
const RelatorioService = require('../services/relatorioService');

// Usamos uma função auto-invocada para garantir que tudo é inicializado corretamente
const createRelatorioController = () => {
    const controller = {};
    // --- CORREÇÃO APLICADA AQUI ---
    // A instância do serviço é criada e atribuída à variável 'relatorioService'
    // que fica disponível para todas as funções do controlador.
    const relatorioService = new RelatorioService(db);

    controller.getPlacasPorRegiao = async (req, res, next) => {
        try {
            const empresa_id = req.user.empresa_id;
            const data = await relatorioService.placasPorRegiao(empresa_id);
            res.status(200).json(data);
        } catch (err) {
            next(err);
        }
    };

    controller.getDashboardSummary = async (req, res, next) => {
        try {
            const empresa_id = req.user.empresa_id;
            const summary = await relatorioService.getDashboardSummary(empresa_id);
            res.status(200).json(summary);
        } catch (err) {
            next(err);
        }
    };

    return controller;
};

// Exporta o objeto controlador já pronto e configurado
module.exports = createRelatorioController();