// services/authService.js

const User = require('../models/User');
const Empresa = require('../models/Empresa'); // Necessário para obter dados da empresa
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// const sendEmail = require('../utils/email'); // Se estiver a usar envio de email
const logger = require('../config/logger');

/**
 * Autentica um utilizador e gera um token JWT.
 * @param {string} email - Email do utilizador.
 * @param {string} password - Senha do utilizador.
 * @returns {Promise<object>} - Objeto com { user, token }.
 */
// <<< GARANTA QUE ESTA LINHA DE EXPORTAÇÃO ESTÁ CORRETA >>>
exports.loginUser = async (email, password) => {
    logger.debug(`[AuthService] Tentando encontrar utilizador com email: ${email}`);
    // Encontra o utilizador pelo email e inclui a senha e o ID da empresa associada
    const user = await User.findOne({ email }).select('+password').populate('empresa', 'nome status_assinatura'); // Popula nome e status da empresa

    if (!user) {
        logger.warn(`[AuthService] Tentativa de login falhou: Utilizador não encontrado para email ${email}`);
        throw new Error('Credenciais inválidas.');
    }

    logger.debug(`[AuthService] Utilizador encontrado: ${user.username}. Verificando senha...`);
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        logger.warn(`[AuthService] Tentativa de login falhou: Senha incorreta para utilizador ${user.username}`);
        throw new Error('Credenciais inválidas.');
    }

    // Verifica se a empresa associada existe e está ativa (se necessário)
    if (!user.empresa) {
        logger.error(`[AuthService] Utilizador ${user.username} (ID: ${user._id}) não tem empresa associada.`);
        throw new Error('Conta de utilizador sem empresa associada. Contacte o suporte.');
    }
     if (user.empresa.status_assinatura !== 'active') {
         logger.warn(`[AuthService] Tentativa de login bloqueada: Assinatura da empresa ${user.empresa.nome} (ID: ${user.empresa._id}) está inativa.`);
         throw new Error('A assinatura da sua empresa está inativa. Contacte o administrador.');
     }

    logger.debug(`[AuthService] Senha correta para utilizador ${user.username}. Gerando token JWT...`);

    // Payload do token JWT
    const payload = {
        id: user._id,
        username: user.username,
        role: user.role,
        empresaId: user.empresa._id // Inclui ID da empresa no token
    };

    // Gera o token
    const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } // Expira em 1 dia por defeito
    );

    logger.info(`[AuthService] Token JWT gerado para utilizador ${user.username}`);

    // Prepara os dados do utilizador para retornar (sem a senha)
    const userToReturn = {
        id: user._id, // Mapeia _id para id
        username: user.username,
        email: user.email,
        role: user.role,
        nome: user.nome,
        sobrenome: user.sobrenome,
        avatar_url: user.avatar_url, // Inclui avatar se existir
        empresa: { // Inclui dados básicos da empresa
            id: user.empresa._id,
            nome: user.empresa.nome
        }
    };

    return { user: userToReturn, token };
};

/**
 * Gera um token de redefinição de senha e (opcionalmente) envia por email.
 * @param {string} email - Email do utilizador.
 * @returns {Promise<void>}
 */
exports.requestPasswordReset = async (email) => {
    logger.debug(`[AuthService] Tentando encontrar utilizador para redefinição de senha: ${email}`);
    const user = await User.findOne({ email });

    if (!user) {
        // Não lançamos erro aqui para não revelar se o email existe
        logger.warn(`[AuthService] Pedido de redefinição para email não encontrado: ${email}. Nenhuma ação tomada.`);
        return; // Retorna silenciosamente
    }

    // Gera o token de redefinição
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false }); // Salva o token e a data de expiração no utilizador

    logger.info(`[AuthService] Token de redefinição gerado para utilizador ${user.username}`);

    // --- Lógica de Envio de Email (Exemplo) ---
    // try {
    //     const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`; // URL do frontend para redefinir
    //     const message = `Recebeu este email porque solicitou a redefinição da sua senha. Por favor, clique no link ou cole-o no seu navegador para completar o processo:\n\n${resetURL}\n\nSe não solicitou isto, por favor ignore este email. Este token expira em 10 minutos.`;
    //
    //     await sendEmail({
    //         to: user.email,
    //         subject: 'Redefinição de Senha - InMidia (Válido por 10 min)',
    //         text: message,
    //         // html: "..." // Pode usar HTML para um email mais formatado
    //     });
    //     logger.info(`[AuthService] Email de redefinição enviado para ${user.email}`);
    // } catch (emailError) {
    //     logger.error(`[AuthService] Erro ao enviar email de redefinição para ${user.email}:`, emailError);
    //     // Limpa o token se o email falhar para permitir nova tentativa?
    //     user.passwordResetToken = undefined;
    //     user.passwordResetExpires = undefined;
    //     await user.save({ validateBeforeSave: false });
    //     throw new Error('Erro ao enviar o email de redefinição. Tente novamente mais tarde.');
    // }
     // ---- Fim da Lógica de Envio de Email ----

     // IMPORTANTE: Mesmo sem email, o token foi gerado e salvo.
     // Para testes, você pode precisar obter o token da base de dados.
     logger.warn(`[AuthService] Envio de email não implementado/ativo. Token gerado para ${user.email}: ${resetToken}`); // Log do token para DEBUG
};

/**
 * Redefine a senha do utilizador usando um token válido.
 * @param {string} token - O token de redefinição.
 * @param {string} newPassword - A nova senha.
 * @returns {Promise<void>}
 */
exports.resetPasswordWithToken = async (token, newPassword) => {
    // 1. Encontra o utilizador pelo token hasheado e verifica a expiração
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    logger.debug(`[AuthService] Procurando utilizador com token hasheado e data de expiração válida.`);

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
        logger.warn(`[AuthService] Tentativa de redefinição com token inválido ou expirado.`);
        throw new Error('Token inválido ou expirado.');
    }

    // 2. Define a nova senha e limpa os campos do token
    logger.debug(`[AuthService] Token válido encontrado para utilizador ${user.username}. Redefinindo senha...`);
    user.password = newPassword; // O Mongoose/bcrypt fará o hash automaticamente no save (ver Model User.js)
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now() - 1000; // Define data de mudança da senha (ligeiramente no passado)

    await user.save(); // Salva as alterações (aciona pre-save hook para hash)

    logger.info(`[AuthService] Senha redefinida com sucesso para utilizador ${user.username}`);
    // Opcional: Gerar um novo token JWT e retornar? Ou apenas confirmar sucesso.
};

/**
 * Verifica se um token de redefinição é válido (sem redefinir a senha).
 * @param {string} token - O token de redefinição.
 * @returns {Promise<object>} - O utilizador (sem dados sensíveis) se o token for válido.
 * @throws {Error} - Se o token for inválido ou expirado.
 */
// <<< GARANTA QUE ESTA FUNÇÃO TAMBÉM ESTÁ A SER EXPORTADA >>>
exports.verifyPasswordResetToken = async (token) => {
     const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
     logger.debug(`[AuthService] Verificando token de redefinição hasheado.`);

     const user = await User.findOne({
         passwordResetToken: hashedToken,
         passwordResetExpires: { $gt: Date.now() }
     });

     if (!user) {
         logger.warn(`[AuthService] Verificação falhou: Token inválido ou expirado.`);
         throw new Error('Token inválido ou expirado.');
     }

     logger.info(`[AuthService] Token de redefinição verificado como válido para utilizador ${user.username}`);
     // Retorna dados mínimos ou apenas confirma sucesso (depende do uso no frontend)
     // return { email: user.email }; // Exemplo
     return user; // Retorna o utilizador encontrado (o controller pode decidir o que enviar)
};