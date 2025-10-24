// InMidia/backend/services/authService.js

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const config = require('../config/config'); // Importa a configuração central (já lê JWT_SECRET)
const User = require('../models/User'); // Importa o modelo User do Mongoose

class AuthService {
    // O construtor já não precisa receber 'db'
    constructor() {
        // A chave secreta é lida diretamente da configuração
        this.secretKey = config.jwtSecret;

        // Verificação extra de segurança no construtor
        if (!this.secretKey) {
            console.error("ERRO FATAL: A chave secreta JWT não está configurada no config.");
            // Idealmente, isto impediria o serviço de ser instanciado ou lançaria um erro mais cedo
            throw new Error('A chave secreta JWT não está configurada no servidor.');
        }
    }

    async login(email, password) {
        // Busca o utilizador por email usando Mongoose
        // Seleciona explicitamente a senha, pois pode estar excluída por padrão no schema
        const user = await User.findOne({ email: email }).select('+password').exec();

        if (!user) {
            const error = new Error('Credenciais inválidas.');
            error.status = 401;
            throw error;
        }

        // Compara a senha
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            const error = new Error('Credenciais inválidas.');
            error.status = 401;
            throw error;
        }

        // Prepara o payload do token usando _id do MongoDB
        const tokenPayload = {
            id: user._id, // Usa _id
            username: user.username,
            role: user.role,
            empresa_id: user.empresa // O campo no schema User chama-se 'empresa'
        };

        // Cria o token JWT
        const token = jwt.sign(tokenPayload, this.secretKey, { expiresIn: '1h' });

        // Retorna o token e os dados básicos do utilizador (sem a senha)
        // Remove a senha do objeto user antes de retornar
        const userResponse = { ...tokenPayload }; // Cria uma cópia segura
        return { token, user: userResponse };
    }

    async forgotPassword(email) {
        // Busca o utilizador por email usando Mongoose
        const user = await User.findOne({ email: email });

        if (user) {
            // Gera o token e a data de expiração
            const resetToken = crypto.randomBytes(32).toString('hex');
            const tokenExpiry = new Date(Date.now() + 3600000); // 1 hora a partir de agora (use Date)

            // Atualiza o documento do utilizador com o token e a expiração usando Mongoose
            await User.updateOne(
                { _id: user._id },
                { $set: { resetToken: resetToken, tokenExpiry: tokenExpiry } }
            );

            // TODO: Enviar o email com o link de redefinição contendo o resetToken
            console.log(`[DEV] Token de redefinição para ${email}: ${resetToken}`);
        }

        // Retorna a mesma mensagem genérica por segurança
        return { message: 'Se uma conta com este e-mail existir, um e-mail de redefinição foi enviado.' };
    }

    async resetPassword(token, newPassword) {
        // Busca o utilizador pelo token e verifica a expiração usando Mongoose
        const user = await User.findOne({
            resetToken: token,
            tokenExpiry: { $gt: Date.now() } // Verifica se a data de expiração é maior que agora
        });

        if (!user) {
            const error = new Error('Token de redefinição inválido ou expirado.');
            error.status = 400;
            throw error;
        }

        // Faz hash da nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 10); // Use saltRounds consistente

        // Atualiza a senha e limpa os campos de reset no documento do utilizador
        await User.updateOne(
            { _id: user._id },
            {
                $set: {
                    password: hashedPassword,
                    resetToken: null, // Limpa o token
                    tokenExpiry: null // Limpa a expiração
                }
            }
        );

        return { message: 'Senha redefinida com sucesso!' };
    }
}

module.exports = AuthService;