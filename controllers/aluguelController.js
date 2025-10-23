// controllers/aluguelController.js
const { validationResult } = require('express-validator');
const AluguelService = require('../services/aluguelService');
const db = require('../config/database');

const createAluguelController = () => {
    const controller = {};
    const aluguelService = new AluguelService(db);

    controller.getAlugueisByPlaca = async (req, res, next) => {
        try {
            const { placaId } = req.params;
            const empresa_id = req.user.empresa_id;
            const alugueis = await aluguelService.getAlugueisByPlaca(placaId, empresa_id);
            res.status(200).json(alugueis);
        } catch (err) {
            next(err);
        }
    };

    controller.createAluguel = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array({ onlyFirstError: true })[0].msg });
        }
        
        try {
            const empresa_id = req.user.empresa_id;
            const novoAluguel = await aluguelService.createAluguel(req.body, empresa_id);
            res.status(201).json(novoAluguel);
        } catch (err) {
            next(err);
        }
    };

    controller.deleteAluguel = async (req, res, next) => {
        try {
            const { id } = req.params;
            const empresa_id = req.user.empresa_id;
            const result = await aluguelService.deleteAluguel(id, empresa_id);
            res.status(200).json(result); // Retorna 200 com mensagem (ou 204 se preferir)
        } catch (err) {
            next(err);
        }
    };

    return controller;
};

module.exports = createAluguelController();