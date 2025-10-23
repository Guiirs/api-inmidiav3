// controllers/regiaoControlle.js
const { validationResult } = require('express-validator');
const RegiaoService = require('../services/regiaoService'); // Importa o serviço
const db = require('../config/database');

    const createRegiaoController = () => {
    const controller = {};
    const regiaoService = new RegiaoService(db); // Cria uma instância do serviço

    controller.getAllRegioes = async (req, res, next) => {
        try {
            const empresa_id = req.user.empresa_id;
            const regioes = await regiaoService.getAll(empresa_id);
            res.status(200).json(regioes);
        } catch (err) {
            next(err);
        }
    };

    controller.createRegiao = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        try {
            const empresa_id = req.user.empresa_id;
            const { nome } = req.body;
            const novaRegiao = await regiaoService.create(nome, empresa_id);
            res.status(201).json(novaRegiao);
        } catch (err) {
            if (err.message.includes('UNIQUE constraint')) {
                return res.status(409).json({ message: 'Já existe uma região com este nome na sua empresa.' });
            }
            next(err);
        }
    };

    controller.updateRegiao = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const empresa_id = req.user.empresa_id;
            const { id } = req.params;
            const { nome } = req.body;
            const regiaoAtualizada = await regiaoService.update(id, nome, empresa_id);
            res.status(200).json(regiaoAtualizada);
        } catch (err) {
            if (err.message.includes('UNIQUE constraint')) {
                return res.status(409).json({ message: 'Já existe uma região com este nome na sua empresa.' });
            }
            next(err);
        }
    };

    controller.deleteRegiao = async (req, res, next) => {
        try {
            const empresa_id = req.user.empresa_id;
            const { id } = req.params;
            await regiaoService.delete(id, empresa_id);
            res.status(204).send();
        } catch (err) {
            next(err);
        }
    };

    return controller;
};

module.exports = createRegiaoController();
// Exporta o resultado da função, ou seja, o próprio objeto controller