// InMidia/backend/controllers/placaController.js
const { validationResult } = require('express-validator');
const PlacaService = require('../services/placaService'); // Serviço Mongoose
const mediaService = require('../services/midiaService'); // Ainda necessário? (O serviço Placa já o usa)
// const db = require('../config/database'); // <-- Remova esta linha
// Validadores permanecem os mesmos
const { placaValidationRules, handleValidationErrors } = require('../validators/placaValidator');

const createPlacaController = () => {
    const controller = {};
    // Instancia o serviço sem passar 'db'
    const placaService = new PlacaService(); // <-- Alteração aqui

    controller.getAllPlacas = async (req, res, next) => {
        try {
            if (!req.user || !req.user.empresa_id) {
                 const error = new Error('Informações de autenticação inválidas.');
                 error.status = 401; throw error;
            }
            const empresa_id = req.user.empresa_id;
            // Chama o serviço refatorado (que já retorna dados formatados)
            const result = await placaService.getAll(empresa_id, req.query);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    };

    controller.getPlacaById = async (req, res, next) => {
        try {
            if (!req.user || !req.user.empresa_id) {
                 const error = new Error('Informações de autenticação inválidas.');
                 error.status = 401; throw error;
            }
            const { id } = req.params; // ID (_id) da placa
            const empresa_id = req.user.empresa_id;
             // Chama o serviço refatorado (que já retorna dados formatados)
            const placa = await placaService.getById(id, empresa_id);
            res.status(200).json(placa);
        } catch (err) {
            next(err); // Passa erro 404
        }
    };

    controller.createPlaca = async (req, res, next) => {
        // A validação já foi feita pelo middleware handleValidationErrors

        try {
            if (!req.user || !req.user.empresa_id) {
                 const error = new Error('Informações de autenticação inválidas.');
                 error.status = 401; throw error;
            }
            const empresa_id = req.user.empresa_id;

            // Prepara os dados, incluindo o file object para o serviço
            const placaData = {
                ...req.body,
                imagemFileObject: req.file // Passa o objeto do ficheiro para o serviço identificar
            };

            // Chama o serviço refatorado
            const placaCriada = await placaService.create(placaData, empresa_id);
            res.status(201).json(placaCriada); // Retorna o documento Mongoose

        } catch (err) {
            // O serviço Mongoose já lida com apagar a imagem em caso de erro
            next(err); // Passa erros (409, upload) para o errorHandler
        }
    };

    controller.updatePlaca = async (req, res, next) => {
        // A validação já foi feita pelo middleware handleValidationErrors

        try {
            if (!req.user || !req.user.empresa_id) {
                 const error = new Error('Informações de autenticação inválidas.');
                 error.status = 401; throw error;
            }
            const { id } = req.params; // ID (_id) da placa
            const empresa_id = req.user.empresa_id;
            const placaData = { ...req.body }; // Dados do formulário

            // Chama o serviço refatorado, passando o ID, dados, empresa e o file object
            const placaAtualizada = await placaService.update(id, placaData, empresa_id, req.file);
            res.status(200).json(placaAtualizada); // Retorna o documento atualizado

        } catch (err) {
            // O serviço Mongoose já lida com apagar a nova imagem em caso de erro
            next(err); // Passa erros (404, 409, upload) para o errorHandler
        }
    };

    controller.deletePlaca = async (req, res, next) => {
        try {
            if (!req.user || !req.user.empresa_id) {
                 const error = new Error('Informações de autenticação inválidas.');
                 error.status = 401; throw error;
            }
            const { id } = req.params; // ID (_id) da placa
            const empresa_id = req.user.empresa_id;
            // Chama o serviço refatorado (que já lida com apagar imagem do R2)
            await placaService.delete(id, empresa_id);
            res.status(204).send(); // No Content
        } catch (err) {
            next(err); // Passa erro 404
        }
    };

    controller.toggleDisponibilidade = async (req, res, next) => {
        try {
            if (!req.user || !req.user.empresa_id) {
                 const error = new Error('Informações de autenticação inválidas.');
                 error.status = 401; throw error;
            }
            const { id } = req.params; // ID (_id) da placa
            const empresa_id = req.user.empresa_id;
            // Chama o serviço refatorado
            const result = await placaService.toggleDisponibilidade(id, empresa_id);
            res.status(200).json(result); // Serviço retorna { message, disponivel }
        } catch (err) {
            next(err); // Passa erros (404, 409 - alugada)
        }
    };

    controller.getAllPlacaLocations = async (req, res, next) => {
        try {
            // Esta função pode precisar ser refatorada no serviço para usar Mongoose
            // Por enquanto, vamos assumir que o serviço foi atualizado ou remover esta rota temporariamente
            // Se o serviço `getAllPlacaLocations` foi movido para o PlacaService e usa Mongoose:
             if (!req.user || !req.user.empresa_id) {
                 const error = new Error('Informações de autenticação inválidas.');
                 error.status = 401; throw error;
             }
            const empresa_id = req.user.empresa_id;
            const locations = await placaService.getAllPlacaLocations(empresa_id); // Assumindo que este método existe no serviço Mongoose
            res.status(200).json(locations);
            // Se NÃO foi refatorado, comente a chamada:
            // res.status(501).json({ message: "Rota getAllPlacaLocations não implementada para MongoDB." });
        } catch (err) {
            next(err);
        }
    };


    return controller;
};

module.exports = createPlacaController();