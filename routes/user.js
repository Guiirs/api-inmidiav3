// routes/user.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const logger = require('../config/logger'); // Importa o logger

// 1. Importa controladores e middlewares
let userController, authenticateToken, handleValidationErrors;
try {
    userController = require('../controllers/userController');
    authenticateToken = require('../middlewares/authMiddleware');
    ({ handleValidationErrors } = require('../validators/authValidator')); // Reutiliza o handler de erros

    if (typeof userController.getUserProfile !== 'function' || typeof authenticateToken !== 'function') {
        logger.error('[Routes User] ERRO CRÍTICO: Controller ou Middleware de User ausentes.');
        throw new Error('Componentes de User incompletos.');
    }
    logger.info('[Routes User] Componentes carregados com sucesso.');
} catch (error) {
    logger.error(`[Routes User] ERRO CRÍTICO ao carregar dependências: ${error.message}`);
    throw new Error('Falha ao carregar dependências de User.');
}

logger.info('[Routes User] Definindo rotas de Utilizador...');

module.exports = () => {
    router.use(authenticateToken); // Aplica autenticação a todas as rotas
    logger.debug('[Routes User] Middleware de Autenticação aplicado a /user/*.');

    // GET /api/user/me - Perfil do Utilizador
    router.get(
        '/me',
        userController.getUserProfile
    );
    logger.debug('[Routes User] Rota GET /me definida (Perfil do Utilizador).');

    // GET /api/user/me/empresa - Perfil da Empresa (Apenas Admin)
    router.get(
        '/me/empresa',
        userController.getEmpresaProfile
    );
    logger.debug('[Routes User] Rota GET /me/empresa definida (Perfil da Empresa).');

    // PUT /api/user/me - Atualiza Perfil do Utilizador
    router.put(
        '/me',
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
                .escape(), // Adiciona escape

            body('password') // Senha NÃO é escapada
                .optional()
                .isLength({ min: 6 }).withMessage('A nova senha precisa ter no mínimo 6 caracteres.'),

            body('nome')
                .optional()
                .trim()
                .isLength({ max: 100 }).withMessage('Nome muito longo (máx 100 caracteres).')
                .escape(), // Adiciona escape

            body('sobrenome')
                .optional()
                .trim()
                .isLength({ max: 100 }).withMessage('Sobrenome muito longo (máx 100 caracteres).')
                .escape(), // Adiciona escape

            body('avatar_url') // URL geralmente não precisa de escape
                .optional({ checkFalsy: true }) // Permite "" ou null
                .trim()
                .isURL().withMessage('A URL do avatar fornecida não é válida.')
        ],
        handleValidationErrors, // Verifica os erros após validação/sanitização
        userController.updateUserProfile // Controller
    );
    logger.debug('[Routes User] Rota PUT /me definida (Atualizar Perfil).');

    // POST /api/user/me/empresa/regenerate-api-key - Regenera API Key
    router.post(
        '/me/empresa/regenerate-api-key',
        [
            // Senha NÃO é escapada
            body('password').notEmpty().withMessage('A sua senha atual é obrigatória para regenerar a chave.')
        ],
        handleValidationErrors, // Verifica se a senha foi enviada
        userController.regenerateEmpresaApiKey
    );
    logger.debug('[Routes User] Rota POST /me/empresa/regenerate-api-key definida (Regenerar API Key).');

    logger.info('[Routes User] Rotas de Utilizador definidas com sucesso.');
    return router;
};