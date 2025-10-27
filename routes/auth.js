// routes/auth.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// Tenta importar os controllers diretamente e verifica se são funções
const {
    login,
    forgotPassword,
    resetPassword,
    verifyResetToken
} = require('../controllers/authController');

// Cria a instância do limitador para o login
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 10, // Limita cada IP a 10 requisições por janela
	message: { message: 'Muitas tentativas de login a partir deste IP, por favor tente novamente após 15 minutos' },
	standardHeaders: true,
	legacyHeaders: false,
    handler: (req, res, next, options) => {
        // Loga o IP (obtido de forma robusta graças ao trust proxy no server.js)
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip;
        logger.warn(`[RateLimit - Login] Limite de taxa atingido para IP: ${ip}. Rota: ${req.originalUrl}`);
        res.status(options.statusCode).send(options.message);
    }
});

logger.info('[Routes Auth] Definindo rotas de Autenticação...');

// --- Rotas de Autenticação ---

// POST /api/auth/login - Login do Utilizador
if (typeof login !== 'function') {
    logger.error('[Routes Auth] ERRO CRÍTICO: authController.login não é uma função!');
    throw new Error('Handler da rota /login inválido.'); // Interrompe se o handler não estiver disponível
}
// Aplica limite de taxa ao login
router.post('/login', loginLimiter, login); 
logger.debug('[Routes Auth] Rota POST /login definida com Rate Limiter.');

// POST /api/auth/forgot-password - Pedido de redefinição de senha
if (typeof forgotPassword !== 'function') {
    logger.error('[Routes Auth] ERRO CRÍTICO: authController.forgotPassword não é uma função!');
    throw new Error('Handler da rota /forgot-password inválido.');
}
router.post('/forgot-password', forgotPassword);
logger.debug('[Routes Auth] Rota POST /forgot-password definida.');

// POST /api/auth/reset-password/:token - Redefinição de senha com token
if (typeof resetPassword !== 'function') {
    logger.error('[Routes Auth] ERRO CRÍTICO: authController.resetPassword não é uma função!');
    throw new Error('Handler da rota /reset-password/:token inválido.');
}
router.post('/reset-password/:token', resetPassword);
logger.debug('[Routes Auth] Rota POST /reset-password/:token definida.');

// GET /api/auth/verify-token/:token - Verifica token de redefinição (GET request)
if (typeof verifyResetToken !== 'function') {
    logger.error('[Routes Auth] ERRO CRÍTICO: authController.verifyResetToken não é uma função!');
    throw new Error('Handler da rota /verify-token/:token inválido.');
}
router.get('/verify-token/:token', verifyResetToken);
logger.debug('[Routes Auth] Rota GET /verify-token/:token definida.');

logger.info('[Routes Auth] Rotas de Autenticação definidas com sucesso.');

// Exporta o router
module.exports = router;            