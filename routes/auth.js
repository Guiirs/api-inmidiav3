// routes/auth.js (CORRIGIDO NOVAMENTE)

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// <<< ALTERADO: Removido o try...catch temporariamente para expor erros >>>
// Tenta importar os controllers diretamente
const {
    login,
    forgotPassword,
    resetPassword,
    verifyResetToken
} = require('../controllers/authController');
// Adiciona um log para verificar se a importação retornou algo
logger.info(`[Routes Auth] Resultado da importação de authController: login (${typeof login}), forgotPassword (${typeof forgotPassword}), resetPassword (${typeof resetPassword}), verifyResetToken (${typeof verifyResetToken})`);


// Cria a instância do limitador UMA VEZ
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 10, // Limita cada IP a 10 requisições por janela
	message: { message: 'Muitas tentativas de login a partir deste IP, por favor tente novamente após 15 minutos' },
	standardHeaders: true,
	legacyHeaders: false,
    // <<< ALTERADO: Removido keyGenerator personalizado para usar o padrão >>>
    // keyGenerator: (req, res) => {
    //     return req.headers['x-forwarded-for'] || req.ip; // Pode causar aviso IPv6
    // },
    handler: (req, res, next, options) => { // Mantém o log de aviso
        // Tenta obter o IP da forma mais confiável possível (considerando proxies)
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip;
        logger.warn(`[RateLimit] Limite de taxa atingido para login do IP: ${ip}`);
        res.status(options.statusCode).send(options.message);
    }
});

logger.info('[Routes Auth] Definindo rotas de Autenticação...');

// --- Rotas de Autenticação ---

// POST /api/auth/login - Login do Utilizador
// Verifica se 'login' é uma função antes de usar
if (typeof login !== 'function') {
    logger.error('[Routes Auth] ERRO CRÍTICO: authController.login não é uma função!');
    throw new Error('Handler da rota /login inválido.');
}
router.post('/login', loginLimiter, login);
logger.debug('[Routes Auth] Rota POST /login definida.');

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
// <<< Linha 60 referenciada no erro >>>
if (typeof verifyResetToken !== 'function') {
    logger.error('[Routes Auth] ERRO CRÍTICO: authController.verifyResetToken não é uma função!');
    throw new Error('Handler da rota /verify-token/:token inválido.'); // Lança erro se não for função
}
router.get('/verify-token/:token', verifyResetToken);
logger.debug('[Routes Auth] Rota GET /verify-token/:token definida.');

// Nota: A rota de registo está em empresaRoutes.js

logger.info('[Routes Auth] Rotas de Autenticação definidas com sucesso.');

module.exports = router;
logger.debug('[Routes Auth] Router exportado.');