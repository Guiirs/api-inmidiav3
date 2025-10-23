// controllers/userController.js
const { validationResult } = require('express-validator');
const UserService = require('../services/userService'); // Importa o serviço
const db = require('../config/database');

    const createUserController = () => {
    const controller = {};
    const userService = new UserService(db); // Cria uma instância do serviço

    controller.getUserProfile = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const user = await userService.getProfile(userId);
            res.status(200).json(user);
        } catch (err) {
            next(err);
        }
    };

    controller.updateUserProfile = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.user.id;
            const updatedUser = await userService.updateProfile(userId, req.body);
            res.status(200).json({ 
                message: 'Dados do usuário atualizados com sucesso.',
                user: updatedUser
            });
        } catch (err) {
            if (err.message.includes('UNIQUE constraint')) {
                const error = new Error('Nome de usuário ou email já está em uso.');
                error.status = 409;
                return next(error);
            }
            next(err);
        }
    };

    controller.getEmpresaProfile = async (req, res, next) => {
        try {
            const empresa_id = req.user.empresa_id;
            const userRole = req.user.role;
            const empresa = await userService.getEmpresaProfile(empresa_id, userRole);
            res.status(200).json(empresa);
        } catch (err) {
            next(err);
        }
    };

    // --- NOVA FUNÇÃO ADICIONADA ---
    controller.regenerateEmpresaApiKey = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Retorna o primeiro erro de validação
            return res.status(400).json({ message: errors.array({ onlyFirstError: true })[0].msg });
        }

        try {
            const userId = req.user.id;
            const empresaId = req.user.empresa_id;
            const userRole = req.user.role;
            const { password } = req.body;

            // Chama o serviço para fazer a lógica
            const result = await userService.regenerateApiKey(userId, empresaId, userRole, password);
            
            // Retorna a *nova* chave completa
            res.status(200).json({
                message: 'API Key regenerada com sucesso! Guarde-a num local seguro.',
                fullApiKey: result.fullApiKey,
                newApiKeyPrefix: result.newPrefix // Envia o novo prefixo para a UI
            });
        } catch (err) {
            next(err); // Deixa o errorHandler tratar (ex: senha errada, não admin)
        }
    };

    return controller;
};

module.exports = createUserController();
// Exporta o resultado da função, ou seja, o próprio objeto controller