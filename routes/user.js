// routes/user.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

module.exports = () => {
    const userController = require('../controllers/userController');
    const authenticateToken = require('../middlewares/authMiddleware');

    router.get(
        '/me',
        authenticateToken,
        userController.getUserProfile
    );

        // --- ADICIONE ESTA NOVA ROTA ---
    // Rota para obter os detalhes da empresa
    router.get(
        '/me/empresa',
        authenticateToken,
        userController.getEmpresaProfile
    );

    router.put(
        '/me',
        authenticateToken,
        [
            body('email').optional().isEmail().withMessage('O e-mail fornecido não é válido.').normalizeEmail(),
            body('username').optional().isLength({ min: 3 }).withMessage('O nome de usuário precisa ter no mínimo 3 caracteres.').trim().escape(),
            body('password').optional().isLength({ min: 6 }).withMessage('A nova senha precisa ter no mínimo 6 caracteres.'),
            // --- LINHAS ADICIONADAS ---
            body('nome').optional().trim().escape(),
            body('sobrenome').optional().trim().escape(),
            body('avatar_url').optional().isURL().withMessage('A URL do avatar fornecida não é válida.')
        ],
        userController.updateUserProfile
    );

    router.post(
        '/me/empresa/regenerate-api-key',
        authenticateToken, // Requer que o utilizador esteja logado
        [
            // Valida que a senha foi enviada
            body('password').notEmpty().withMessage('A sua senha atual é obrigatória para regenerar a chave.')
        ],
        userController.regenerateEmpresaApiKey // Nova função no controlador
    );

    return router;
};