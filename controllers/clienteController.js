// controllers/clienteController.js
const { validationResult } = require('express-validator');
const ClienteService = require('../services/clienteService');
const db = require('../config/database');

const createClienteController = () => {
    const controller = {};
    const clienteService = new ClienteService(db);

    controller.getAll = async (req, res, next) => {
        const empresa_id = req.user.empresa_id;
        const clientes = await clienteService.getAll(empresa_id);
        res.status(200).json(clientes);
    };

    controller.create = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const empresa_id = req.user.empresa_id;
        const cliente = await clienteService.create(req.body, empresa_id, req.file);
        res.status(201).json(cliente);
    };

    controller.update = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const { id } = req.params;
        const empresa_id = req.user.empresa_id;
        const cliente = await clienteService.update(id, req.body, empresa_id, req.file);
        res.status(200).json(cliente);
    };

    controller.delete = async (req, res, next) => {
        const { id } = req.params;
        const empresa_id = req.user.empresa_id;
        await clienteService.delete(id, empresa_id);
        res.status(204).send();
    };
    
    return controller;
};

module.exports = createClienteController();