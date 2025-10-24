// routes/auth.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { loginValidationRules, handleValidationErrors } = require('../validators/authValidator');
const authController = require('../controllers/authController'); // Importa o controller diretamente

module.exports = () => {
    const router = express.Router();

    // Cria a instância do rate limiter
    const authLimiter = rateLimit({
        windowMs: 10 * 60 * 1000, // 10 minutes
        max: 5, // Max 5 requests per windowMs
        message: { message: 'Muitas tentativas de autenticação deste IP, por favor, tente novamente após 10 minutos.' },
        // standardHeaders: true, // Recommended: send Retry-After header
        // legacyHeaders: false, // Recommended: Disable X-RateLimit-* headers
    });

    // --- Middleware Condicional ---
    // Cria um middleware vazio que não faz nada (apenas chama next())
    const skipLimiter = (req, res, next) => { next(); };
    // Decide qual middleware usar baseado no NODE_ENV
    const limiterToUse = process.env.NODE_ENV === 'test' ? skipLimiter : authLimiter;
    // ----------------------------

    // A ROTA DE REGISTO DE UTILIZADOR FOI REMOVIDA DESTE FICHEIRO.

    // Rota de Login: Pode manter o limiter aqui se quiser, ou usar o condicional também
    router.post(
        '/login',
        limiterToUse, // <-- Aplica o limiter condicional
        loginValidationRules(),
        handleValidationErrors,
        authController.login
    );

    // Rotas de recuperação de password usam o limiter condicional
    router.post(
        '/forgot-password',
        limiterToUse, // <-- Aplica o limiter condicional
        authController.forgotPassword
    );
    router.post(
        '/reset-password/:token',
        limiterToUse, // <-- Aplica o limiter condicional
        authController.resetPassword
    );

    return router;
};