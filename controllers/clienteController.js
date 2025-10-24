// controllers/clienteController.js
const { validationResult } = require('express-validator');
const ClienteService = require('../services/clienteService'); // Serviço Mongoose
// const db = require('../config/database'); // <-- Remova esta linha

const createClienteController = () => {
    const controller = {};
    // Instancia o serviço sem passar 'db'
    const clienteService = new ClienteService(); // <-- Alteração aqui

    controller.getAll = async (req, res, next) => {
        try { // Adicionado try...catch que faltava na versão anterior
            const empresa_id = req.user.empresa_id;
            const clientes = await clienteService.getAll(empresa_id);
            res.status(200).json(clientes);
        } catch (err) {
            next(err);
        }
    };

    controller.create = async (req, res, next) => {
        // Validação de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Se houver erro de validação e foi feito upload, o serviço Mongoose já trata de apagar a imagem do R2
            return res.status(400).json({ errors: errors.array() });
        }

        try { // Adicionado try...catch
            const empresa_id = req.user.empresa_id;
            // Passa req.body (dados do cliente) e req.file (objeto do ficheiro) para o serviço
            const cliente = await clienteService.create(req.body, empresa_id, req.file);
            res.status(201).json(cliente);
        } catch (err) {
            next(err); // Passa erros (409, erro de upload) para o errorHandler
        }
    };

    controller.update = async (req, res, next) => {
        // Validação de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Se houver erro de validação e foi feito upload, o serviço Mongoose já trata de apagar a nova imagem do R2
            return res.status(400).json({ errors: errors.array() });
        }

        try { // Adicionado try...catch
            const { id } = req.params; // ID (_id) do cliente
            const empresa_id = req.user.empresa_id;
            // Passa id, req.body, empresa_id e req.file para o serviço
            const cliente = await clienteService.update(id, req.body, empresa_id, req.file);
            res.status(200).json(cliente);
        } catch (err) {
            next(err); // Passa erros (404, 409, erro de upload) para o errorHandler
        }
    };

    controller.delete = async (req, res, next) => {
        try { // Adicionado try...catch
            const { id } = req.params; // ID (_id) do cliente
            const empresa_id = req.user.empresa_id;
            // Chama o serviço refatorado
            await clienteService.delete(id, empresa_id);
            res.status(204).send(); // No Content
        } catch (err) {
            next(err); // Passa erros (404) para o errorHandler
        }
    };

    return controller;
};

module.exports = createClienteController();