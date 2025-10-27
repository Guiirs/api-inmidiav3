// controllers/authController.js

const authService = require('../services/authService'); // Importa o serviço de autenticação
const logger = require('../config/logger'); // Importa o logger

/**
 * Controller para login do utilizador.
 */
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        logger.info(`[AuthController] Tentativa de login para email: ${email}`);

        // Validação básica de entrada
        if (!email || !password) {
            logger.warn(`[AuthController] Tentativa de login falhou: Email ou senha em falta.`);
            return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
        }

        const result = await authService.loginUser(email, password); // Usa o serviço para logar

        logger.info(`[AuthController] Login bem-sucedido para email: ${email}`);
        res.status(200).json(result); // Retorna { user, token }
    } catch (error) {
        logger.error(`[AuthController] Erro durante o login para email ${req.body.email}: ${error.message}`);
        // Retorna 401 para credenciais inválidas ou erro específico do serviço
        if (error.message.includes('inválid') || error.message.includes('encontrado')) {
             return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        next(error); // Passa outros erros para o errorHandler
    }
};

/**
 * Controller para solicitar a redefinição de senha.
 */
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        logger.info(`[AuthController] Pedido de redefinição de senha para email: ${email}`);

        if (!email) {
             logger.warn(`[AuthController] Pedido de redefinição falhou: Email em falta.`);
            return res.status(400).json({ message: 'Email é obrigatório.' });
        }

        await authService.requestPasswordReset(email); // Usa o serviço

        logger.info(`[AuthController] Instruções de redefinição enviadas (se o email existir) para: ${email}`);
        // Resposta genérica para não revelar se o email existe ou não
        res.status(200).json({ message: 'Se o email estiver registado, receberá instruções para redefinir a senha.' });
    } catch (error) {
        logger.error(`[AuthController] Erro ao solicitar redefinição de senha para email ${req.body.email}: ${error.message}`);
        next(error);
    }
};

/**
 * Controller para redefinir a senha usando um token.
 */
exports.resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;
        logger.info(`[AuthController] Tentativa de redefinição de senha com token.`); // Não logar o token

        if (!newPassword) {
             logger.warn(`[AuthController] Redefinição de senha falhou: Nova senha em falta.`);
            return res.status(400).json({ message: 'Nova senha é obrigatória.' });
        }
         // Adicionar validação de força da senha aqui se necessário (ex: min 6 caracteres)
         if (newPassword.length < 6) {
             logger.warn(`[AuthController] Redefinição de senha falhou: Nova senha muito curta.`);
            return res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres.' });
         }


        await authService.resetPasswordWithToken(token, newPassword); // Usa o serviço

        logger.info(`[AuthController] Senha redefinida com sucesso usando token.`);
        res.status(200).json({ message: 'Senha redefinida com sucesso.' });
    } catch (error) {
        logger.error(`[AuthController] Erro ao redefinir senha com token: ${error.message}`);
        // Retorna erro específico se o token for inválido/expirado
        if (error.message.includes('inválido ou expirado')) {
             return res.status(400).json({ message: 'Token inválido ou expirado.' });
        }
        next(error);
    }
};

/**
 * Verifica se um token de redefinição de senha é válido.
 */
// <<< CORREÇÃO: Garante que esta função está a ser exportada corretamente >>>
exports.verifyResetToken = async (req, res, next) => {
    try {
        const { token } = req.params;
        logger.info(`[AuthController] Tentativa de verificação de token de redefinição.`); // Não logar o token

        // Usa o serviço para verificar o token
        // O serviço lançará um erro se o token for inválido ou expirado
        await authService.verifyPasswordResetToken(token);

        // Se chegou aqui, o token é válido
        logger.info(`[AuthController] Token de redefinição verificado como válido.`);
        res.status(200).json({ message: 'Token válido.' });
    } catch (error) {
        logger.error(`[AuthController] Erro ao verificar token de redefinição: ${error.message}`);
        // Retorna um erro específico se o token for inválido/expirado
        if (error.message.includes('inválido ou expirado')) {
             return res.status(400).json({ message: 'Token inválido ou expirado.' });
        }
        next(error); // Outros erros
    }
};

// Nota: A lógica de registo (registerEmpresa) está em empresaController.js
// Se precisar de uma rota /register aqui, ela chamaria empresaController.registerEmpresa