// services/authService.js

const User = require('../models/User');
const Empresa = require('../models/Empresa'); // Necessário para obter dados da empresa
const bcrypt = require('bcryptjs'); // Usar bcryptjs consistentemente (se for o caso) ou bcrypt
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// const sendEmail = require('../utils/email'); // Se estiver a usar envio de email
const logger = require('../config/logger');
const config = require('../config/config'); // Importa config para JWT_SECRET e JWT_EXPIRES_IN

/**
 * Autentica um utilizador e gera um token JWT.
 * @param {string} email - Email do utilizador.
 * @param {string} password - Senha do utilizador.
 * @returns {Promise<object>} - Objeto com { user, token }.
 * @throws {Error} - Lança erro com status 401 (Credenciais inválidas) ou 500 (Erro interno).
 */
exports.loginUser = async (email, password) => {
    logger.info(`[AuthService] Tentativa de login para email: ${email}`);

    if (!email || !password) {
        // Embora o controller possa validar, é bom ter uma verificação aqui também
        const error = new Error('Email e senha são obrigatórios.');
        error.status = 400; // Bad Request (apesar de resultar em 401 no controller)
        logger.warn(`[AuthService] Tentativa de login falhou: ${error.message}`);
        throw error;
    }

    try {
        logger.debug(`[AuthService] Procurando utilizador com email: ${email}`);
        // Encontra o utilizador pelo email e inclui a senha e dados populados da empresa
        const user = await User.findOne({ email })
                               .select('+password') // Pede explicitamente a senha
                               .populate('empresa', 'nome status_assinatura') // Popula nome e status da empresa
                               .exec();

        if (!user) {
            logger.warn(`[AuthService] Tentativa de login falhou: Utilizador não encontrado para email ${email}`);
            throw new Error('Credenciais inválidas.'); // Erro genérico para não revelar se o email existe
        }

        logger.debug(`[AuthService] Utilizador encontrado: ${user.username}. Verificando senha...`);
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            logger.warn(`[AuthService] Tentativa de login falhou: Senha incorreta para utilizador ${user.username} (email: ${email})`);
            throw new Error('Credenciais inválidas.');
        }

        // Verifica se a empresa associada existe e está ativa
        if (!user.empresa) {
            // Este é um erro de integridade de dados, logar como erro grave
            logger.error(`[AuthService] ERRO GRAVE: Utilizador ${user.username} (ID: ${user._id}) não tem empresa associada.`);
            throw new Error('Conta de utilizador inválida. Contacte o suporte.'); // Erro 500 implícito
        }
         if (user.empresa.status_assinatura !== 'active') {
             logger.warn(`[AuthService] Tentativa de login bloqueada: Assinatura da empresa ${user.empresa.nome} (ID: ${user.empresa._id}) está inativa para o utilizador ${user.username}.`);
             // Lança um erro específico que pode ser tratado no controller se necessário
             const inactiveError = new Error('A assinatura da sua empresa está inativa. Contacte o administrador.');
             inactiveError.status = 403; // Forbidden
             throw inactiveError;
         }

        logger.debug(`[AuthService] Senha correta para utilizador ${user.username}. Gerando token JWT...`);

        // Payload do token JWT
        const payload = {
            id: user._id,
            username: user.username,
            role: user.role,
            empresaId: user.empresa._id // Inclui ID da empresa no token
        };

        // Gera o token usando as configurações
        const token = jwt.sign(
            payload,
            config.jwtSecret, // Usa a chave secreta da configuração
            { expiresIn: config.jwtExpiresIn || '1d' } // Usa a expiração da configuração ou '1d'
        );

        logger.info(`[AuthService] Token JWT gerado para utilizador ${user.username}`);

        // Prepara os dados do utilizador para retornar (sem a senha e _id/__v)
        // A transformação global .toJSON() deve tratar _id -> id e remover __v
        const userToReturn = user.toJSON ? user.toJSON() : { ...user._doc }; // Garante um objeto simples
        delete userToReturn.password; // Garante que a senha é removida
        // O .populate já traz a empresa, mas podemos reestruturar se necessário
        userToReturn.empresa_id = user.empresa._id; // Adiciona explicitamente se não vier do toJSON
        userToReturn.empresa_nome = user.empresa.nome; // Adiciona explicitamente se não vier do toJSON

        return { user: userToReturn, token };

    } catch (error) {
         // Se já for um erro lançado por nós (Credenciais inválidas, Assinatura inativa), relança-o
         if (error.message === 'Credenciais inválidas.' || error.status === 403) {
            error.status = error.status || 401; // Garante status 401 para credenciais
            throw error;
         }
         // Loga outros erros (ex: DB)
         logger.error(`[AuthService] Erro inesperado durante o login para ${email}: ${error.message}`, { stack: error.stack });
         // Lança um erro genérico 500
         const serviceError = new Error(`Erro interno durante a autenticação: ${error.message}`);
         serviceError.status = 500;
         throw serviceError;
    }
};

/**
 * Gera um token de redefinição de senha, salva no utilizador e (opcionalmente) envia por email.
 * @param {string} email - Email do utilizador.
 * @returns {Promise<void>}
 * @throws {Error} - Lança erro com status 500 se houver falha ao salvar ou enviar email (se ativo).
 */
exports.requestPasswordReset = async (email) => {
    logger.info(`[AuthService] Pedido de redefinição de senha para email: ${email}`);
    try {
        const user = await User.findOne({ email });

        if (!user) {
            logger.warn(`[AuthService] Pedido de redefinição para email não encontrado: ${email}. Nenhuma ação externa será tomada.`);
            // Retorna silenciosamente para não revelar a existência do email
            return;
        }

        // Gera o token de redefinição (método no model User.js)
        const resetToken = user.createPasswordResetToken(); // Gera token não hasheado
        // O método createPasswordResetToken já deve definir passwordResetToken (hasheado) e passwordResetExpires no objeto 'user'

        logger.debug(`[AuthService] Token de redefinição (não hasheado) gerado para ${user.username}. Salvando token hasheado e expiração...`);

        // Salva o token hasheado e a data de expiração no utilizador
        // validateBeforeSave: false é importante para não validar outros campos (como senha antiga)
        await user.save({ validateBeforeSave: false });

        logger.info(`[AuthService] Token de redefinição salvo para utilizador ${user.username}.`);

        // --- Lógica de Envio de Email (Exemplo Mantido Comentado) ---
        // try {
        //     const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`; // URL do frontend para redefinir
        //     const message = `... link: ${resetURL} ...`;
        //     await sendEmail({ /* ... opções ... */ });
        //     logger.info(`[AuthService] Email de redefinição enviado para ${user.email}`);
        // } catch (emailError) {
        //     logger.error(`[AuthService] Erro ao enviar email de redefinição para ${user.email}:`, emailError);
        //     // Limpa o token se o email falhar para permitir nova tentativa
        //     user.passwordResetToken = undefined;
        //     user.passwordResetExpires = undefined;
        //     await user.save({ validateBeforeSave: false }); // Tenta salvar a limpeza
        //     // Lança um erro para o controller saber que falhou
        //     const emailError = new Error('Erro ao enviar o email de redefinição. Tente novamente mais tarde.');
        //     emailError.status = 500;
        //     throw emailError;
        // }
        // ---- Fim da Lógica de Envio de Email ----

        // Log do token NÃO HASHEADO para DEBUG (remover em produção real se email funcionar)
        logger.debug(`[AuthService] Token (não hasheado) para ${user.email}: ${resetToken}`);

    } catch (error) {
        // Captura erros do findOne, save, ou do envio de email (se ativo)
        logger.error(`[AuthService] Erro ao processar pedido de redefinição para ${email}: ${error.message}`, { stack: error.stack });
        // Lança um erro genérico 500
        const serviceError = new Error(`Erro interno ao solicitar redefinição de senha: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};

/**
 * Redefine a senha do utilizador usando um token válido.
 * @param {string} token - O token de redefinição (não hasheado).
 * @param {string} newPassword - A nova senha.
 * @returns {Promise<void>}
 * @throws {Error} - Lança erro com status 400 (Token inválido/expirado) ou 500 (Erro interno).
 */
exports.resetPasswordWithToken = async (token, newPassword) => {
    logger.info(`[AuthService] Tentativa de redefinição de senha com token.`); // Não logar o token
    if (!token || !newPassword) {
        const error = new Error('Token e nova senha são obrigatórios.');
        error.status = 400;
        logger.warn(`[AuthService] Falha na redefinição: ${error.message}`);
        throw error;
    }
     if (newPassword.length < 6) { // Validação mínima (poderia ser mais forte)
         const error = new Error('A nova senha deve ter pelo menos 6 caracteres.');
         error.status = 400;
         logger.warn(`[AuthService] Falha na redefinição: ${error.message}`);
         throw error;
     }

    try {
        // 1. Hashea o token recebido para procurar no DB
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        logger.debug(`[AuthService] Procurando utilizador com token hasheado correspondente e data de expiração válida.`);

        // 2. Encontra o utilizador pelo token hasheado e verifica a expiração
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() } // Verifica se ainda é válido
        }).select('+passwordChangedAt'); // Seleciona passwordChangedAt se precisar invalidar JWTs antigos

        if (!user) {
            logger.warn(`[AuthService] Tentativa de redefinição com token inválido ou expirado.`);
            throw new Error('Token inválido ou expirado.'); // Lança erro 400 (tratado no catch)
        }

        // 3. Define a nova senha e limpa os campos do token
        logger.debug(`[AuthService] Token válido encontrado para utilizador ${user.username}. Redefinindo senha...`);
        user.password = newPassword; // O hook pre-save no Model User fará o hash
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        // Opcional: Atualizar passwordChangedAt para invalidar tokens JWT antigos, se implementado
        // user.passwordChangedAt = Date.now() - 1000; // Define data de mudança (ligeiramente no passado)

        await user.save(); // Salva as alterações (aciona pre-save hook para hash)

        logger.info(`[AuthService] Senha redefinida com sucesso para utilizador ${user.username}`);
        // O controller enviará a resposta de sucesso

    } catch (error) {
        // Se for o erro "Token inválido ou expirado" lançado por nós
        if (error.message === 'Token inválido ou expirado.') {
            error.status = 400;
            throw error;
        }
        // Loga outros erros (ex: DB)
        logger.error(`[AuthService] Erro inesperado ao redefinir senha com token: ${error.message}`, { stack: error.stack });
        // Lança um erro genérico 500
        const serviceError = new Error(`Erro interno ao redefinir senha: ${error.message}`);
        serviceError.status = 500;
        throw serviceError;
    }
};

/**
 * Verifica se um token de redefinição é válido (sem redefinir a senha).
 * @param {string} token - O token de redefinição (não hasheado).
 * @returns {Promise<object>} - Retorna um objeto indicando validade (ex: { valid: true }) ou lança erro.
 * @throws {Error} - Lança erro com status 400 (Token inválido/expirado) ou 500 (Erro interno).
 */
exports.verifyPasswordResetToken = async (token) => {
     logger.info(`[AuthService] Verificando token de redefinição.`); // Não logar token
     if (!token) {
         const error = new Error('Token é obrigatório.');
         error.status = 400;
         throw error;
     }
     try {
         const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
         logger.debug(`[AuthService] Procurando utilizador com token hasheado correspondente e data de expiração válida para verificação.`);

         const user = await User.findOne({
             passwordResetToken: hashedToken,
             passwordResetExpires: { $gt: Date.now() } // Verifica se ainda é válido
         }).lean(); // lean() é suficiente, só precisamos saber se existe

         if (!user) {
             logger.warn(`[AuthService] Verificação falhou: Token inválido ou expirado.`);
             throw new Error('Token inválido ou expirado.'); // Lança erro 400 (tratado no catch)
         }

         logger.info(`[AuthService] Token de redefinição verificado como válido.`);
         return { valid: true }; // Retorna confirmação simples

     } catch (error) {
         // Se for o erro "Token inválido ou expirado" lançado por nós
         if (error.message === 'Token inválido ou expirado.') {
             error.status = 400;
             throw error;
         }
         // Loga outros erros (ex: DB)
         logger.error(`[AuthService] Erro inesperado ao verificar token de redefinição: ${error.message}`, { stack: error.stack });
         // Lança um erro genérico 500
         const serviceError = new Error(`Erro interno ao verificar token: ${error.message}`);
         serviceError.status = 500;
         throw serviceError;
     }
};