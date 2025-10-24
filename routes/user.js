// routes/user.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const authenticateToken = require('../middlewares/authMiddleware');
// Reutiliza o handler de erros de validação
const { handleValidationErrors } = require('../validators/authValidator');

module.exports = () => {

    router.get(
        '/me',
        authenticateToken,
        userController.getUserProfile
    );

    router.get(
        '/me/empresa',
        authenticateToken,
        userController.getEmpresaProfile
    );

    router.put(
        '/me',
        authenticateToken,
        [ // Array de validações/sanitizações
            body('email')
                .optional() // Permite não enviar
                .isEmail().withMessage('O e-mail fornecido não é válido.')
                .normalizeEmail() // Normaliza/Sanitiza email
                .isLength({ max: 100 }).withMessage('E-mail muito longo (máx 100 caracteres).'),

            body('username')
                .optional()
                .trim() // Remove espaços
                .isLength({ min: 3, max: 50 }).withMessage('O nome de utilizador deve ter entre 3 e 50 caracteres.')
                .escape(), // <-- Adiciona escape

            body('password') // Senha NÃO é escapada
                .optional()
                .isLength({ min: 6 }).withMessage('A nova senha precisa ter no mínimo 6 caracteres.'),

            body('nome')
                .optional()
                .trim()
                .isLength({ max: 100 }).withMessage('Nome muito longo (máx 100 caracteres).')
                .escape(), // <-- Adiciona escape

            body('sobrenome')
                .optional()
                .trim()
                .isLength({ max: 100 }).withMessage('Sobrenome muito longo (máx 100 caracteres).')
                .escape(), // <-- Adiciona escape

            body('avatar_url') // URL geralmente não precisa de escape, mas validação é boa
                .optional({ checkFalsy: true }) // Permite "" ou null
                .trim()
                .isURL().withMessage('A URL do avatar fornecida não é válida.')
        ],
        handleValidationErrors, // Verifica os erros após validação/sanitização
        userController.updateUserProfile // Controller
    );

    router.post(
        '/me/empresa/regenerate-api-key',
        authenticateToken,
        [
            // Senha NÃO é escapada
            body('password').notEmpty().withMessage('A sua senha atual é obrigatória para regenerar a chave.')
        ],
        handleValidationErrors, // Verifica se a senha foi enviada
        userController.regenerateEmpresaApiKey
    );

    return router;
};