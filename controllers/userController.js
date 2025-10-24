// controllers/userController.js
const { validationResult } = require('express-validator');
const UserService = require('../services/userService'); // Importa o serviço
// const db = require('../config/database'); // <-- Remova esta linha

    const createUserController = () => {
    const controller = {};
    // Instancia o serviço sem passar 'db'
    const userService = new UserService(); // <-- Alteração aqui

    controller.getUserProfile = async (req, res, next) => {
        try {
            // O ID do utilizador vem do token JWT (authMiddleware)
            const userId = req.user.id; // O serviço Mongoose espera o ID (_id)
            const user = await userService.getProfile(userId);
            // O serviço Mongoose já retorna os campos corretos (sem senha)
            res.status(200).json(user);
        } catch (err) {
            next(err);
        }
    };

    controller.updateUserProfile = async (req, res, next) => {
        // Validação de entrada permanece a mesma
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Mongoose pode lançar erros de validação também, mas esta é a validação de entrada
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.user.id; // ID do utilizador do token
            // Chama o serviço refatorado
            const updatedUser = await userService.updateProfile(userId, req.body);
            // O serviço já retorna o utilizador atualizado (sem senha)
            res.status(200).json({
                message: 'Dados do usuário atualizados com sucesso.',
                user: updatedUser // Retorna o objeto do utilizador atualizado
            });
        } catch (err) {
            // O serviço já trata o erro de duplicação (409)
            // if (err.message.includes('UNIQUE constraint')) { // <-- Lógica antiga
            //     const error = new Error('Nome de usuário ou email já está em uso.');
            //     error.status = 409;
            //     return next(error);
            // }
            next(err); // Passa outros erros (incluindo 404, 409 do serviço) para o errorHandler
        }
    };

    controller.getEmpresaProfile = async (req, res, next) => {
        try {
            // Dados vêm do token JWT
            const empresa_id = req.user.empresa_id; // O serviço espera o ID (_id) da empresa
            const userRole = req.user.role;
            // Chama o serviço refatorado
            const empresa = await userService.getEmpresaProfile(empresa_id, userRole);
            // O serviço já retorna os campos corretos
            res.status(200).json(empresa);
        } catch (err) {
            next(err); // Passa erros (403, 404) para o errorHandler
        }
    };

    controller.regenerateEmpresaApiKey = async (req, res, next) => {
        // Validação de entrada permanece a mesma
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array({ onlyFirstError: true })[0].msg });
        }

        try {
            // Dados vêm do token JWT
            const userId = req.user.id;
            const empresaId = req.user.empresa_id;
            const userRole = req.user.role;
            const { password } = req.body; // Senha para verificação

            // Chama o serviço refatorado
            const result = await userService.regenerateApiKey(userId, empresaId, userRole, password);

            // Resposta permanece a mesma (o serviço retorna fullApiKey e newPrefix)
            res.status(200).json({
                message: 'API Key regenerada com sucesso! Guarde-a num local seguro.',
                fullApiKey: result.fullApiKey,
                newApiKeyPrefix: result.newPrefix
            });
        } catch (err) {
            next(err); // Deixa o errorHandler tratar erros (401, 403, 404)
        }
    };

    return controller;
};

module.exports = createUserController();