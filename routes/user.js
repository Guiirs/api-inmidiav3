// routes/user.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const logger = require('../config/logger');

// 1. Importa controladores e middlewares
let userController, authenticateToken, handleValidationErrors;
try {
    userController = require('../controllers/userController');
    authenticateToken = require('../middlewares/authMiddleware');
    // Reutiliza o handler de erros de validação
    ({ handleValidationErrors } = require('../validators/authValidator')); 

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

// [MELHORIA] Aplica autenticação a todas as rotas
router.use(authenticateToken); 
logger.debug('[Routes User] Middleware de Autenticação aplicado a /user/*.');

// GET /api/v1/user/me - Perfil do Utilizador
router.get(
    '/me',
    userController.getUserProfile
);
logger.debug('[Routes User] Rota GET /me definida (Perfil do Utilizador).');

// GET /api/v1/user/me/empresa - Perfil da Empresa (Apenas Admin)
router.get(
    '/me/empresa',
    userController.getEmpresaProfile
);
logger.debug('[Routes User] Rota GET /me/empresa definida (Perfil da Empresa).');

// PUT /api/v1/user/me - Atualiza Perfil do Utilizador
router.put(
    '/me',
    [ // Array de validações/sanitizações (mantido)
        body('email')
            .optional() 
            .isEmail().withMessage('O e-mail fornecido não é válido.')
            .normalizeEmail() 
            .isLength({ max: 100 }).withMessage('E-mail muito longo (máx 100 caracteres).'),

        body('username')
            .optional()
            .trim() 
            .isLength({ min: 3, max: 50 }).withMessage('O nome de utilizador deve ter entre 3 e 50 caracteres.')
            .escape(), 

        body('password') 
            .optional()
            .isLength({ min: 6 }).withMessage('A nova senha precisa ter no mínimo 6 caracteres.'),

        body('nome')
            .optional()
            .trim()
            .isLength({ max: 100 }).withMessage('Nome muito longo (máx 100 caracteres).')
            .escape(), 

        body('sobrenome')
            .optional()
            .trim()
            .isLength({ max: 100 }).withMessage('Sobrenome muito longo (máx 100 caracteres).')
            .escape(), 

        body('avatar_url') 
            .optional({ checkFalsy: true }) 
            .trim()
            .isURL().withMessage('A URL do avatar fornecida não é válida.')
    ],
    handleValidationErrors, 
    userController.updateUserProfile 
);
logger.debug('[Routes User] Rota PUT /me definida (Atualizar Perfil).');

// POST /api/v1/user/me/empresa/regenerate-api-key - Regenera API Key
router.post(
    '/me/empresa/regenerate-api-key',
    [
        body('password').notEmpty().withMessage('A sua senha atual é obrigatória para regenerar a chave.')
    ],
    handleValidationErrors, 
    userController.regenerateEmpresaApiKey
);
logger.debug('[Routes User] Rota POST /me/empresa/regenerate-api-key definida (Regenerar API Key).');

logger.info('[Routes User] Rotas de Utilizador definidas com sucesso.');

// [CORREÇÃO] Exporta o router diretamente
module.exports = router;