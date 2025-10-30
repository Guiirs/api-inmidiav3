// controllers/authController.js

const authService = require('../services/authService'); // Importa o serviço de autenticação
const logger = require('../config/logger'); // Importa o logger
const { validationResult } = require('express-validator'); // Para validação (usada nas rotas)

/**
 * Controller para login do utilizador.
 */
exports.login = async (req, res, next) => {
    logger.info(`[AuthController] Recebida requisição POST /auth/login.`);
    // A validação de email/password é feita pelo express-validator nas rotas
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array({ onlyFirstError: true })[0].msg;
        logger.warn(`[AuthController] Login falhou: Erro de validação: ${firstError}`);
        // Retorna 400 Bad Request com a mensagem de erro da validação
        return res.status(400).json({ message: firstError });
    }

    const { email, password } = req.body;
    logger.debug(`[AuthController] Tentativa de login para email: ${email}`); // Evitar logar password

    try {
        // Chama o serviço para logar (que já tem tratamento de erros robusto)
        const result = await authService.loginUser(email, password);

        logger.info(`[AuthController] Login bem-sucedido para email: ${email}. Enviando resposta.`);
        res.status(200).json(result); // Retorna { user, token }
    } catch (error) {
        // Loga o erro recebido do serviço antes de passar para o errorHandler
        logger.error(`[AuthController] Erro durante o login para email ${email}: ${error.message}`, { status: error.status, stack: error.stack });
        // O errorHandler tratará o status (400, 401, 403, 500) vindo do serviço
        next(error);
    }
};

/**
 * Controller para solicitar a redefinição de senha.
 */
exports.forgotPassword = async (req, res, next) => {
    logger.info(`[AuthController] Recebida requisição POST /auth/forgot-password.`);
    // Validação básica (poderia usar express-validator nas rotas também)
    const { email } = req.body;
    if (!email) {
         logger.warn(`[AuthController] Pedido de redefinição falhou: Email em falta no corpo da requisição.`);
        return res.status(400).json({ message: 'Email é obrigatório.' });
    }
    logger.debug(`[AuthController] Pedido de redefinição de senha para email: ${email}`);


    try {
        // Chama o serviço (que retorna silenciosamente se email não existir)
        await authService.requestPasswordReset(email);

        logger.info(`[AuthController] Processamento de forgotPassword concluído para email: ${email}. Enviando resposta genérica.`);
        // Resposta genérica para não revelar se o email existe ou não
        res.status(200).json({ message: 'Se o email estiver registado, receberá instruções para redefinir a senha.' });
    } catch (error) {
        // Loga o erro recebido do serviço (ex: falha ao salvar token, falha ao enviar email se ativo)
        logger.error(`[AuthController] Erro ao chamar authService.requestPasswordReset para email ${email}: ${error.message}`, { status: error.status, stack: error.stack });
        // O errorHandler tratará o status (provavelmente 500) vindo do serviço
        next(error);
    }
};

/**
 * Controller para redefinir a senha usando um token.
 */
exports.resetPassword = async (req, res, next) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    logger.info(`[AuthController] Recebida requisição POST /auth/reset-password/${token ? 'com_token' : 'sem_token'}.`); // Evita logar o token diretamente

    // Validação básica (complementa a validação dentro do serviço)
    if (!token) {
        logger.warn(`[AuthController] Redefinição de senha falhou: Token em falta na URL.`);
        return res.status(400).json({ message: 'Token de redefinição em falta.' });
    }
    if (!newPassword) {
         logger.warn(`[AuthController] Redefinição de senha falhou: Nova senha em falta no corpo da requisição.`);
        return res.status(400).json({ message: 'Nova senha é obrigatória.' });
    }
    // Validação mínima de comprimento (o serviço também valida)
     if (newPassword.length < 6) {
         logger.warn(`[AuthController] Redefinição de senha falhou: Nova senha muito curta.`);
        return res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres.' });
     }

    try {
        // Chama o serviço (que já tem tratamento de erros robusto)
        await authService.resetPasswordWithToken(token, newPassword);

        logger.info(`[AuthController] Senha redefinida com sucesso usando token (hash omitido).`);
        res.status(200).json({ message: 'Senha redefinida com sucesso.' });
    } catch (error) {
        // Loga o erro recebido do serviço
        logger.error(`[AuthController] Erro ao chamar authService.resetPasswordWithToken: ${error.message}`, { status: error.status, stack: error.stack });
        // O errorHandler tratará o status (400 - token inválido/senha curta, 500) vindo do serviço
        next(error);
    }
};

/**
 * Controller para verificar se um token de redefinição de senha é válido.
 */
exports.verifyResetToken = async (req, res, next) => {
    const { token } = req.params;
    logger.info(`[AuthController] Recebida requisição GET /auth/verify-token/${token ? 'com_token' : 'sem_token'}.`); // Evita logar o token

    // Validação básica
    if (!token) {
        logger.warn(`[AuthController] Verificação de token falhou: Token em falta na URL.`);
        return res.status(400).json({ message: 'Token de verificação em falta.' });
    }

    try {
        // Chama o serviço para verificar o token
        // O serviço lançará um erro 400 se o token for inválido ou expirado
        await authService.verifyPasswordResetToken(token);

        logger.info(`[AuthController] Token de redefinição verificado como válido (hash omitido).`);
        res.status(200).json({ message: 'Token válido.' }); // Responde que é válido
    } catch (error) {
        // Loga o erro recebido do serviço
        logger.error(`[AuthController] Erro ao chamar authService.verifyPasswordResetToken: ${error.message}`, { status: error.status, stack: error.stack });
        // O errorHandler tratará o status (400, 500) vindo do serviço
        next(error);
    }
};

// 🐞 CORREÇÃO: A CHAVE '}' EXTRA QUE ESTAVA AQUI FOI REMOVIDA.