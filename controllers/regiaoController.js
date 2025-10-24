// controllers/regiaoController.js
const { validationResult } = require('express-validator');
const RegiaoService = require('../services/regiaoService'); // Importa o serviço Mongoose
// const db = require('../config/database'); // <-- Remova esta linha

    const createRegiaoController = () => {
    const controller = {};
    // Instancia o serviço sem passar 'db'
    const regiaoService = new RegiaoService(); // <-- Alteração aqui

    controller.getAllRegioes = async (req, res, next) => {
        try {
            const empresa_id = req.user.empresa_id; // ID da empresa do token
            // Chama o serviço refatorado
            const regioes = await regiaoService.getAll(empresa_id);
            res.status(200).json(regioes); // Serviço retorna a lista de documentos
        } catch (err) {
            next(err);
        }
    };

    controller.createRegiao = async (req, res, next) => {
        // Validação de entrada permanece a mesma
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const empresa_id = req.user.empresa_id;
            const { nome } = req.body;
            // Chama o serviço refatorado
            const novaRegiao = await regiaoService.create(nome, empresa_id);
            res.status(201).json(novaRegiao); // Serviço retorna o novo documento
        } catch (err) {
            // O serviço já trata o erro de duplicação (409)
            // if (err.message.includes('UNIQUE constraint')) { // <-- Lógica antiga
            //     return res.status(409).json({ message: 'Já existe uma região com este nome na sua empresa.' });
            // }
            next(err); // Passa outros erros (incluindo 409) para o errorHandler
        }
    };

    controller.updateRegiao = async (req, res, next) => {
        // Validação de entrada permanece a mesma
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const empresa_id = req.user.empresa_id;
            const { id } = req.params; // ID (_id) da região
            const { nome } = req.body; // Novo nome
            // Chama o serviço refatorado
            const regiaoAtualizada = await regiaoService.update(id, nome, empresa_id);
            res.status(200).json(regiaoAtualizada); // Serviço retorna o documento atualizado
        } catch (err) {
             // O serviço já trata o erro de duplicação (409) e não encontrado (404)
            // if (err.message.includes('UNIQUE constraint')) { // <-- Lógica antiga
            //     return res.status(409).json({ message: 'Já existe uma região com este nome na sua empresa.' });
            // }
            next(err); // Passa erros (404, 409) para o errorHandler
        }
    };

    controller.deleteRegiao = async (req, res, next) => {
        try {
            const empresa_id = req.user.empresa_id;
            const { id } = req.params; // ID (_id) da região
            // Chama o serviço refatorado
            await regiaoService.delete(id, empresa_id);
            res.status(204).send(); // No Content
        } catch (err) {
            next(err); // Passa erros (400 - em uso, 404 - não encontrado) para o errorHandler
        }
    };

    return controller;
};

module.exports = createRegiaoController();