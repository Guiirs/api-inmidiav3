// @ts-nocheck
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param } from 'express-validator';
import logger from '../config/logger';
import { authRateLimiter } from '../middlewares/rateLimitMiddleware';
import { handleValidationErrors } from '../validators/authValidator';
import {
    login,
    forgotPassword,
    resetPassword,
    verifyResetToken
} from '../controllers/authController';

const router = Router();

// Rate limiter específico para login
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

// Validações
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

// POST /api/v1/auth/login
if (typeof login !== 'function') {
    logger.error('[Routes Auth] ERRO CRÍTICO: authController.login não é uma função!');
    throw new Error('Handler da rota /login inválido.');
}
router.post(
    '/login',
    loginLimiter,
    validateLogin,
    handleValidationErrors,
    login
);
logger.debug('[Routes Auth] Rota POST /login definida com Rate Limiter e Validação.');

// POST /api/v1/auth/forgot-password
if (typeof forgotPassword !== 'function') {
    logger.error('[Routes Auth] ERRO CRÍTICO: authController.forgotPassword não é uma função!');
    throw new Error('Handler da rota /forgot-password inválido.');
}
router.post(
    '/forgot-password',
    authRateLimiter,
    validateForgotPassword,
    handleValidationErrors,
    forgotPassword
);
logger.debug('[Routes Auth] Rota POST /forgot-password definida com Validação e Rate Limit.');

// POST /api/v1/auth/reset-password/:token
if (typeof resetPassword !== 'function') {
    logger.error('[Routes Auth] ERRO CRÍTICO: authController.resetPassword não é uma função!');
    throw new Error('Handler da rota /reset-password/:token inválido.');
}
router.post(
    '/reset-password/:token',
    authRateLimiter,
    validateResetPassword,
    handleValidationErrors,
    resetPassword
);
logger.debug('[Routes Auth] Rota POST /reset-password/:token definida com Validação e Rate Limit.');

// GET /api/v1/auth/verify-token/:token
if (typeof verifyResetToken !== 'function') {
    logger.error('[Routes Auth] ERRO CRÍTICO: authController.verifyResetToken não é uma função!');
    throw new Error('Handler da rota /verify-token/:token inválido.');
}
router.get(
    '/verify-token/:token',
    validateVerifyToken,
    handleValidationErrors,
    verifyResetToken
);
logger.debug('[Routes Auth] Rota GET /verify-token/:token definida com Validação.');

logger.info('[Routes Auth] Rotas de Autenticação definidas com sucesso.');
logger.debug('[Routes Auth] Router exportado.');

export default router;
