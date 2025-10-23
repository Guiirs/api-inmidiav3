// InMidia/backend/services/authService.js

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const config = require('../config/config'); // 1. Importa a configuração central

class AuthService {
    // 2. O construtor já não recebe 'secretKey'
    constructor(db) {
        this.db = db;
        // 3. A chave secreta é lida diretamente da configuração, garantindo consistência
        this.secretKey = config.jwtSecret;
    }

    async login(email, password) {
        // A consulta agora usa 'email'
        const user = await this.db('users').where({ email: email }).first();

        if (!user) {
            const error = new Error('Credenciais inválidas.');
            error.status = 401;
            throw error;
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            const error = new Error('Credenciais inválidas.');
            error.status = 401;
            throw error;
        }

        // Se a chave secreta não estiver definida (verificação extra)
        if (!this.secretKey) {
            const error = new Error('A chave secreta JWT não está configurada no servidor.');
            error.status = 500;
            throw error;
        }

        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            empresa_id: user.empresa_id
        };
        // --- ADICIONE ESTA LINHA ---
        console.log('--- LOGIN --- CHAVE USADA PARA CRIAR O TOKEN:', this.secretKey);
        // A criação do token usa a chave secreta consistente
        const token = jwt.sign(tokenPayload, this.secretKey, { expiresIn: '1h' });
        
        return { token, user: tokenPayload };
    }

    async forgotPassword(email) {
        const user = await this.db('users').where({ email: email }).first();

        if (user) {
            const resetToken = crypto.randomBytes(32).toString('hex');
            const tokenExpiry = Date.now() + 3600000; // 1 hora

            await this.db('users').where({ id: user.id }).update({ resetToken, tokenExpiry });
            
            console.log(`[DEV] Token de redefinição para ${email}: ${resetToken}`);
        }

        return { message: 'Se uma conta com este e-mail existir, um e-mail de redefinição foi enviado.' };
    }

    async resetPassword(token, newPassword) {
        const user = await this.db('users')
            .where({ resetToken: token })
            .andWhere('tokenExpiry', '>', Date.now())
            .first();

        if (!user) {
            const error = new Error('Token de redefinição inválido ou expirado.');
            error.status = 400;
            throw error;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await this.db('users').where({ id: user.id }).update({
            password: hashedPassword,
            resetToken: null,
            tokenExpiry: null
        });

        return { message: 'Senha redefinida com sucesso!' };
    }
}

module.exports = AuthService;