// InMidia/backend/controllers/relatorioController.js
// const db = require('../config/database'); // <-- Remova esta linha
const RelatorioService = require('../services/relatorioService'); // Serviço Mongoose

const createRelatorioController = () => {
    const controller = {};
    // Instancia o serviço sem passar 'db'
    const relatorioService = new RelatorioService(); // <-- Alteração aqui

    controller.getPlacasPorRegiao = async (req, res, next) => {
        try {
            const empresa_id = req.user.empresa_id; // ID da empresa do token
            // Chama o serviço refatorado
            const data = await relatorioService.placasPorRegiao(empresa_id);
            res.status(200).json(data); // Serviço retorna o resultado da agregação
        } catch (err) {
            next(err);
        }
    };

    controller.getDashboardSummary = async (req, res, next) => {
        try {
            const empresa_id = req.user.empresa_id; // ID da empresa do token
             // Chama o serviço refatorado
            const summary = await relatorioService.getDashboardSummary(empresa_id);
            res.status(200).json(summary); // Serviço retorna o objeto de sumário
        } catch (err) {
            next(err);
        }
    };

    return controller;
};

module.exports = createRelatorioController();