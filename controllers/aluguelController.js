// controllers/aluguelController.js
const { validationResult } = require('express-validator');
const AluguelService = require('../services/aluguelService'); // Serviço Mongoose
// const db = require('../config/database'); // <-- Remova esta linha

const createAluguelController = () => {
    const controller = {};
    // Instancia o serviço sem passar 'db'
    const aluguelService = new AluguelService(); // <-- Alteração aqui

    controller.getAlugueisByPlaca = async (req, res, next) => {
        try {
            const { placaId } = req.params; // ID (_id) da placa
            const empresa_id = req.user.empresa_id;
            // Chama o serviço refatorado
            const alugueis = await aluguelService.getAlugueisByPlaca(placaId, empresa_id);
            res.status(200).json(alugueis); // Serviço retorna lista de documentos populados
        } catch (err) {
            next(err);
        }
    };

    controller.createAluguel = async (req, res, next) => {
        // Validação de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array({ onlyFirstError: true })[0].msg });
        }

        try {
            const empresa_id = req.user.empresa_id;
            // Chama o serviço refatorado (passa req.body)
            const novoAluguel = await aluguelService.createAluguel(req.body, empresa_id);
            res.status(201).json(novoAluguel); // Serviço retorna o novo documento
        } catch (err) {
            next(err); // Passa erros (400 - datas inválidas, 409 - conflito)
        }
    };

    controller.deleteAluguel = async (req, res, next) => {
        try {
            const { id } = req.params; // ID (_id) do aluguel
            const empresa_id = req.user.empresa_id;
            // Chama o serviço refatorado
            const result = await aluguelService.deleteAluguel(id, empresa_id);
            res.status(200).json(result); // Serviço retorna { success, message }
        } catch (err) {
            next(err); // Passa erro 404
        }
    };

    return controller;
};

module.exports = createAluguelController();