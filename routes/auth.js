// routes/auth.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');
// [MELHORIA] Importa validadores e o handler de erros
const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../validators/authValidator');

// Tenta importar os controllers (verificação mantida)
const {
    login,
    forgotPassword,
    resetPassword,
    verifyResetToken
} = require('../controllers/authController');

// Cria a instância do limitador para o login (mantido)
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 10,
	message: { message: 'Muitas tentativas de login a partir deste IP, por favor tente novamente após 15 minutos' },
	standardHeaders: true,
	legacyHeaders: false,
    handler: (req, res, next, options) => {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip;
        logger.warn(`[RateLimit - Login] Limite de taxa atingido para IP: ${ip}. Rota: ${req.originalUrl}`);
        res.status(options.statusCode).send(options.message);
    }
});

// --- [MELHORIA] Define regras de validação ---

const validateLogin = [
    body('email')
        .isEmail().withMessage('O e-mail fornecido não é válido.')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('A senha é obrigatória.')
];

const validateForgotPassword = [
    body('email')
        .isEmail().withMessage('O e-mail fornecido não é válido.')
        .normalizeEmail()
];

const validateResetPassword = [
    param('token')
        .notEmpty().withMessage('O token de redefinição é obrigatório.'),
    body('newPassword')
        .isLength({ min: 6 }).withMessage('A nova senha deve ter pelo menos 6 caracteres.')
];

const validateVerifyToken = [
    param('token')
        .notEmpty().withMessage('O token de verificação é obrigatório.')
];

logger.info('[Routes Auth] Definindo rotas de Autenticação...');

// --- Rotas de Autenticação ---

// POST /api/v1/auth/login
if (typeof login !== 'function') {
    logger.error('[Routes Auth] ERRO CRÍTICO: authController.login não é uma função!');
    throw new Error('Handler da rota /login inválido.');
}
router.post(
    '/login',
    loginLimiter,           // 1. Aplica Rate Limit
    validateLogin,          // 2. [MELHORIA] Valida o body
    handleValidationErrors, // 3. [MELHORIA] Trata os erros de validação
    login                   // 4. Chama o controller
); 
logger.debug('[Routes Auth] Rota POST /login definida com Rate Limiter e Validação.');

// POST /api/v1/auth/forgot-password
if (typeof forgotPassword !== 'function') {
    logger.error('[Routes Auth] ERRO CRÍTICO: authController.forgotPassword não é uma função!');
    throw new Error('Handler da rota /forgot-password inválido.');
}
router.post(
    '/forgot-password',
    validateForgotPassword, // 1. [MELHORIA] Valida o body
    handleValidationErrors, // 2. [MELHORIA] Trata os erros
    forgotPassword
);
logger.debug('[Routes Auth] Rota POST /forgot-password definida com Validação.');

// POST /api/v1/auth/reset-password/:token
if (typeof resetPassword !== 'function') {
    logger.error('[Routes Auth] ERRO CRÍTICO: authController.resetPassword não é uma função!');
    throw new Error('Handler da rota /reset-password/:token inválido.');
}
router.post(
    '/reset-password/:token',
    validateResetPassword,  // 1. [MELHORIA] Valida o token (param) e a senha (body)
    handleValidationErrors, // 2. [MELHORIA] Trata os erros
    resetPassword
);
logger.debug('[Routes Auth] Rota POST /reset-password/:token definida com Validação.');

// GET /api/v1/auth/verify-token/:token
if (typeof verifyResetToken !== 'function') {
    logger.error('[Routes Auth] ERRO CRÍTICO: authController.verifyResetToken não é uma função!');
    throw new Error('Handler da rota /verify-token/:token inválido.');
}
router.get(
    '/verify-token/:token',
    validateVerifyToken,    // 1. [MELHORIA] Valida o token (param)
    handleValidationErrors, // 2. [MELHORIA] Trata os erros
    verifyResetToken
);
logger.debug('[Routes Auth] Rota GET /verify-token/:token definida com Validação.');

logger.info('[Routes Auth] Rotas de Autenticação definidas com sucesso.');

// Exporta o router (já estava correto)
module.exports = router;
logger.debug('[Routes Auth] Router exportado.');