// routes/auth.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { loginValidationRules, handleValidationErrors } = require('../validators/authValidator');

module.exports = () => {
    const router = express.Router();
    
    const authController = require('../controllers/authController');
    const authLimiter = rateLimit({
        windowMs: 10 * 60 * 1000,
        max: 5,
        message: { message: 'Muitas tentativas de autenticação deste IP, por favor, tente novamente após 10 minutos.' }
    });

    // A ROTA DE REGISTO DE UTILIZADOR FOI REMOVIDA DESTE FICHEIRO.

    // Rota de Login: continua a funcionar como antes
    router.post(
        '/login',
        authLimiter,
        loginValidationRules(),
        handleValidationErrors,
        authController.login
    );

    // Rotas de recuperação de password continuam a funcionar
    router.post('/forgot-password', authLimiter, authController.forgotPassword);
    router.post('/reset-password/:token', authLimiter, authController.resetPassword);

    return router;
};