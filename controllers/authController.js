// controllers/authController.js

const AuthService = require('../services/authService'); // [CORREÇÃO] Importa a CLASSE
const logger = require('../config/logger'); 
const { validationResult } = require('express-validator'); 

// [CORREÇÃO] Instancia o serviço fora das funções do controller
const authService = new AuthService(); // Instancia a classe

/**
 * Controller para login do utilizador.
 */
exports.login = async (req, res, next) => {
    logger.info(`[AuthController] Recebida requisição POST /auth/login.`);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array({ onlyFirstError: true })[0].msg;
        logger.warn(`[AuthController] Login falhou: Erro de validação: ${firstError}`);
        return res.status(400).json({ message: firstError });
    }

    const { email, password } = req.body;
    logger.debug(`[AuthController] Tentativa de login para email: ${email}`);

    try {
        // [CORREÇÃO] Chama o método correto da instância: authService.login
        const result = await authService.login(email, password); // <--- MUDANÇA AQUI!

        logger.info(`[AuthController] Login bem-sucedido para email: ${email}. Enviando resposta.`);
        res.status(200).json(result); 
    } catch (error) {
        logger.error(`[AuthController] Erro durante o login para email ${email}: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * Controller para solicitar a redefinição de senha.
 */
exports.forgotPassword = async (req, res, next) => {
    logger.info(`[AuthController] Recebida requisição POST /auth/forgot-password.`);
    const { email } = req.body;
    if (!email) {
         logger.warn(`[AuthController] Pedido de redefinição falhou: Email em falta no corpo da requisição.`);
        return res.status(400).json({ message: 'Email é obrigatório.' });
    }
    logger.debug(`[AuthController] Pedido de redefinição de senha para email: ${email}`);

    try {
        // [CORREÇÃO] Chama o método correto da instância: authService.requestPasswordReset
        await authService.requestPasswordReset(email); 

        logger.info(`[AuthController] Processamento de forgotPassword concluído para email: ${email}. Enviando resposta genérica.`);
        res.status(200).json({ message: 'Se o email estiver registado, receberá instruções para redefinir a senha.' });
    } catch (error) {
        logger.error(`[AuthController] Erro ao chamar authService.requestPasswordReset para email ${email}: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * Controller para redefinir a senha usando um token.
 */
exports.resetPassword = async (req, res, next) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    logger.info(`[AuthController] Recebida requisição POST /auth/reset-password/${token ? 'com_token' : 'sem_token'}.`); 

    if (!token) {
        logger.warn(`[AuthController] Redefinição de senha falhou: Token em falta na URL.`);
        return res.status(400).json({ message: 'Token de redefinição em falta.' });
    }
    if (!newPassword || newPassword.length < 6) {
        logger.warn(`[AuthController] Redefinição de senha falhou: Nova senha em falta ou muito curta.`);
        return res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }

    try {
        // [CORREÇÃO] Chama o método correto da instância: authService.resetPasswordWithToken
        await authService.resetPasswordWithToken(token, newPassword);

        logger.info(`[AuthController] Senha redefinida com sucesso usando token (hash omitido).`);
        res.status(200).json({ message: 'Senha redefinida com sucesso.' });
    } catch (error) {
        logger.error(`[AuthController] Erro ao chamar authService.resetPasswordWithToken: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * Controller para verificar se um token de redefinição de senha é válido.
 */
exports.verifyResetToken = async (req, res, next) => {
    const { token } = req.params;
    logger.info(`[AuthController] Recebida requisição GET /auth/verify-token/${token ? 'com_token' : 'sem_token'}.`); 

    if (!token) {
        logger.warn(`[AuthController] Verificação de token falhou: Token em falta na URL.`);
        return res.status(400).json({ message: 'Token de verificação em falta.' });
    }

    try {
        // [CORREÇÃO] Chama o método correto da instância: authService.verifyPasswordResetToken
        await authService.verifyPasswordResetToken(token);

        logger.info(`[AuthController] Token de redefinição verificado como válido (hash omitido).`);
        res.status(200).json({ message: 'Token válido.' }); 
    } catch (error) {
        logger.error(`[AuthController] Erro ao chamar authService.verifyPasswordResetToken: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};