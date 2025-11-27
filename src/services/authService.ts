// @ts-nocheck
// src/services/authService.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import config from '../config/config';
import logger from '../config/logger';
import AppError from '../utils/AppError';

interface UserPayload {
    id: any;
    empresaId: any;
    role: string;
    username: string;
    email: string;
}

interface LoginResult {
    token: string;
    user: {
        id: any;
        username: string;
        email: string;
        nome?: string;
        sobrenome?: string;
        role: string;
        empresaId: any;
        createdAt?: Date;
    };
}

interface ChangePasswordResult {
    message: string;
}

class AuthService {
    constructor() {}

    /**
     * Gera um token JWT para um utilizador.
     */
    generateToken(user: UserPayload): string {
        const payload = {
            id: user.id,
            empresaId: user.empresaId,
            role: user.role,
            username: user.username,
            email: user.email
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
     */
    async login(usernameOrEmail: string, password: string): Promise<LoginResult> {
        logger.info(`[AuthService] Tentativa de login para: ${usernameOrEmail}`);
        
        try {
            const user = await User.findOne({ 
                $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
            }).select('+password +empresa').lean();

            if (!user) {
                logger.warn(`[AuthService] Tentativa de login falhada: Utilizador não encontrado para ${usernameOrEmail}.`);
                throw new AppError('Credenciais inválidas.', 401);
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                logger.warn(`[AuthService] Tentativa de login falhada: Senha incorreta para utilizador ${user.username}.`);
                throw new AppError('Credenciais inválidas.', 401);
            }

            logger.info(`[AuthService] Login bem-sucedido para utilizador ${user.username} (ID: ${user._id}).`);

            const userForToken: UserPayload = {
                id: user._id,
                empresaId: user.empresa,
                role: user.role,
                username: user.username,
                email: user.email,
            };
            
            const token = this.generateToken(userForToken);

            const userData = {
                id: user._id,
                username: user.username,
                email: user.email,
                nome: user.nome,
                sobrenome: user.sobrenome,
                role: user.role,
                empresaId: user.empresa,
                createdAt: user.createdAt,
            };
            
            return { token, user: userData };

        } catch (error: any) {
            logger.error(`[AuthService] Erro no login: ${error.message}`, { stack: error.stack, status: error.status });
            
            if (error instanceof AppError) throw error; 
            throw new AppError(`Erro interno durante o login: ${error.message}`, 500);
        }
    }
    
    /**
     * Altera a senha do utilizador.
     */
    async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<ChangePasswordResult> {
        logger.info(`[AuthService] Tentativa de alteração de senha para ID: ${userId}`);

        if (oldPassword === newPassword) {
            throw new AppError('A nova senha não pode ser igual à senha atual.', 400);
        }

        try {
            const user = await User.findById(userId).select('+password').exec();

            if (!user) {
                logger.warn(`[AuthService] Alteração de senha falhada: Utilizador ID ${userId} não encontrado.`);
                throw new AppError('Utilizador não encontrado.', 404);
            }

            const isMatch = await bcrypt.compare(oldPassword, user.password);

            if (!isMatch) {
                logger.warn(`[AuthService] Alteração de senha falhada: Senha antiga incorreta para ID ${userId}.`);
                throw new AppError('A senha antiga está incorreta.', 400);
            }

            const newHashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = newHashedPassword;
            await user.save();

            logger.info(`[AuthService] Senha alterada com sucesso para ID: ${userId}`);
            return { message: 'Senha alterada com sucesso.' };

        } catch (error: any) {
            logger.error(`[AuthService] Erro ao alterar senha para ID ${userId}: ${error.message}`, { stack: error.stack, status: error.status });
            
            if (error instanceof AppError) throw error; 
            throw new AppError(`Erro interno ao alterar senha: ${error.message}`, 500);
        }
    }
}

export default AuthService;

