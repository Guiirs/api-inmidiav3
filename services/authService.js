// services/authService.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Importa o modelo User
const config = require('../config/config'); // Configurações de JWT
const logger = require('../config/logger');
const AppError = require('../utils/AppError'); // [MELHORIA] Importa o AppError

class AuthService {
    constructor() {}

    /**
     * Gera um token JWT para um utilizador.
     * @param {object} user - O objeto do utilizador (id, empresaId, role, username).
     * @returns {string} - O token JWT assinado.
     */
    generateToken(user) {
        // Campos que vão para o payload do token
        const payload = {
            id: user.id,
            empresaId: user.empresaId, // Adiciona o ID da empresa para acesso rápido
            role: user.role,
            username: user.username
        };

        const token = jwt.sign(
            payload,
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );

        logger.debug(`[AuthService] Token JWT gerado para o utilizador ${user.username} (ID: ${user.id}). Expira em ${config.jwtExpiresIn}.`);
        return token;
    }

    /**
     * Autentica um utilizador e retorna um token.
     * @param {string} usernameOrEmail - Nome de utilizador ou email.
     * @param {string} password - Senha.
     * @returns {Promise<object>} - Objeto contendo { token, user: { id, username, email, role } }.
     * @throws {AppError} - Em caso de falha na autenticação (401) ou erro interno (500).
     */
    async login(usernameOrEmail, password) {
        logger.info(`[AuthService] Tentativa de login para: ${usernameOrEmail}`);
        
        try {
            // Busca o utilizador pelo username OU email
            const user = await User.findOne({ 
                $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
            }).select('+password +empresa').lean(); // Seleciona a password e a empresa, e usa .lean()

            if (!user) {
                logger.warn(`[AuthService] Tentativa de login falhada: Utilizador não encontrado para ${usernameOrEmail}.`);
                // [MELHORIA] Usa AppError(401)
                throw new AppError('Credenciais inválidas.', 401);
            }

            // Compara a senha
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                logger.warn(`[AuthService] Tentativa de login falhada: Senha incorreta para utilizador ${user.username}.`);
                 // [MELHORIA] Usa AppError(401)
                throw new AppError('Credenciais inválidas.', 401);
            }

            logger.info(`[AuthService] Login bem-sucedido para utilizador ${user.username} (ID: ${user._id}).`);

            // Mapeia para um objeto seguro e limpo para o token
            const userForToken = {
                id: user._id, // O ID do utilizador (ObjectId)
                empresaId: user.empresa, // O ID da empresa (ObjectId)
                role: user.role,
                username: user.username,
            };
            
            // Gere o token
            const token = this.generateToken(userForToken);

            // Retorna o token e os dados públicos do utilizador (usando campos limpos)
            const userData = {
                id: user._id, // O Mongoose .lean() mantém _id, mas a conversão implícita ou explícita em controllers/routes deve mapear para 'id'
                username: user.username,
                email: user.email,
                nome: user.nome,
                sobrenome: user.sobrenome,
                role: user.role,
                empresaId: user.empresa,
                createdAt: user.createdAt,
            };
            
            return { token, user: userData };

        } catch (error) {
            logger.error(`[AuthService] Erro no login: ${error.message}`, { stack: error.stack, status: error.status });
            
            // [MELHORIA] Trata e relança AppErrors ou lança 500
            if (error instanceof AppError) throw error; 
            throw new AppError(`Erro interno durante o login: ${error.message}`, 500);
        }
    }
    
    /**
     * Altera a senha do utilizador.
     * @param {string} userId - ID do utilizador.
     * @param {string} oldPassword - Senha antiga.
     * @param {string} newPassword - Senha nova.
     * @returns {Promise<object>} - Objeto de sucesso.
     * @throws {AppError} - Lança erro com status 400, 404 ou 500.
     */
    async changePassword(userId, oldPassword, newPassword) {
        logger.info(`[AuthService] Tentativa de alteração de senha para ID: ${userId}`);

        // [MELHORIA] Usa AppError(400)
        if (oldPassword === newPassword) {
            throw new AppError('A nova senha não pode ser igual à senha atual.', 400);
        }

        try {
            // 1. Busca o utilizador (seleciona a password)
            const user = await User.findById(userId).select('+password').exec();

            if (!user) {
                logger.warn(`[AuthService] Alteração de senha falhada: Utilizador ID ${userId} não encontrado.`);
                // [MELHORIA] Usa AppError(404)
                throw new AppError('Utilizador não encontrado.', 404);
            }

            // 2. Compara a senha antiga
            const isMatch = await bcrypt.compare(oldPassword, user.password);

            if (!isMatch) {
                logger.warn(`[AuthService] Alteração de senha falhada: Senha antiga incorreta para ID ${userId}.`);
                // [MELHORIA] Usa AppError(400)
                throw new AppError('A senha antiga está incorreta.', 400);
            }

            // 3. Hashea e salva a nova senha
            const newHashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = newHashedPassword;
            await user.save();

            logger.info(`[AuthService] Senha alterada com sucesso para ID: ${userId}`);
            return { message: 'Senha alterada com sucesso.' };

        } catch (error) {
            logger.error(`[AuthService] Erro ao alterar senha para ID ${userId}: ${error.message}`, { stack: error.stack, status: error.status });
            
            // [MELHORIA] Trata e relança AppErrors ou lança 500
            if (error instanceof AppError) throw error; 
            throw new AppError(`Erro interno ao alterar senha: ${error.message}`, 500);
        }
    }
}

module.exports = AuthService;