// controllers/authController.js

const authService = require('../services/authService');
const logger = require('../config/logger');
// const { validationResult } = require('express-validator'); // Não é mais necessário

/**
 * Controller para login do utilizador.
 * POST /api/v1/auth/login
 */
exports.login = async (req, res, next) => {
    logger.info(`[AuthController] Recebida requisição POST /auth/login.`);
    // [MELHORIA] Remove a checagem de validationResult. Confia que a rota já a executou.

    const { email, password } = req.body;
    logger.debug(`[AuthController] Tentativa de login para email: ${email}`);

    try {
        const result = await authService.loginUser(email, password);

        logger.info(`[AuthController] Login bem-sucedido para email: ${email}. Enviando resposta.`);
        res.status(200).json(result); // Retorna { user, token }
    } catch (error) {
        // O erro (que deve ser um AppError/Credenciais inválidas do service) é passado para o errorHandler global
        logger.error(`[AuthController] Erro durante o login para email ${email}: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * Controller para solicitar a redefinição de senha.
 * POST /api/v1/auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
    logger.info(`[AuthController] Recebida requisição POST /auth/forgot-password.`);
    // [MELHORIA] Remove validação manual. Confia que a rota já validou o email.
    
    const { email } = req.body;
    logger.debug(`[AuthController] Pedido de redefinição de senha para email: ${email}`);


    try {
        // O serviço retorna silenciosamente se o email não existir (boa prática de segurança)
        await authService.requestPasswordReset(email);

        logger.info(`[AuthController] Processamento de forgotPassword concluído para email: ${email}. Enviando resposta genérica.`);
        // Resposta genérica para não revelar se o email existe ou não
        res.status(200).json({ message: 'Se o email estiver registado, receberá instruções para redefinir a senha.' });
    } catch (error) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[AuthController] Erro ao chamar authService.requestPasswordReset para email ${email}: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * Controller para redefinir a senha usando um token.
 * POST /api/v1/auth/reset-password/:token
 */
exports.resetPassword = async (req, res, next) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    logger.info(`[AuthController] Recebida requisição POST /auth/reset-password/${token ? 'com_token' : 'sem_token'}.`); 

    // [MELHORIA] Remove validações manuais de token/senha. Confia que a rota já as executou.

    try {
        await authService.resetPasswordWithToken(token, newPassword);

        logger.info(`[AuthController] Senha redefinida com sucesso usando token (hash omitido).`);
        res.status(200).json({ message: 'Senha redefinida com sucesso.' });
    } catch (error) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[AuthController] Erro ao chamar authService.resetPasswordWithToken: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * Controller para verificar se um token de redefinição de senha é válido.
 * GET /api/v1/auth/verify-token/:token
 */
exports.verifyResetToken = async (req, res, next) => {
    const { token } = req.params;
    logger.info(`[AuthController] Recebida requisição GET /auth/verify-token/${token ? 'com_token' : 'sem_token'}.`); 

    // [MELHORIA] Remove validação manual de token. Confia que a rota já a executou.

    try {
        // O serviço lançará um erro 400 se o token for inválido ou expirado
        await authService.verifyPasswordResetToken(token);

        logger.info(`[AuthController] Token de redefinição verificado como válido (hash omitido).`);
        res.status(200).json({ message: 'Token válido.' }); 
    } catch (error) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[AuthController] Erro ao chamar authService.verifyPasswordResetToken: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};