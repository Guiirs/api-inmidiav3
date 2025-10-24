// InMidia/backend/services/authService.js

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const config = require('../config/config'); // Importa a configuração central
const User = require('../models/User'); // Importa o modelo User do Mongoose

class AuthService {
    constructor() {
        this.secretKey = config.jwtSecret;
        if (!this.secretKey) {
            console.error("ERRO FATAL: A chave secreta JWT não está configurada no config.");
            throw new Error('A chave secreta JWT não está configurada no servidor.');
        }
    }

    async login(email, password) {
        // Busca o utilizador por email
        // Adiciona .lean() para performance, mas seleciona explicitamente a senha
        const user = await User.findOne({ email: email })
                               .select('+password') // Seleciona a senha para comparação
                               .lean() // <-- Adicionado .lean()
                               .exec();

        if (!user) {
            const error = new Error('Credenciais inválidas.');
            error.status = 401;
            throw error;
        }

        // Compara a senha (bcrypt funciona com o hash do objeto lean)
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            const error = new Error('Credenciais inválidas.');
            error.status = 401;
            throw error;
        }

        // Prepara o payload do token (user é um objeto simples agora)
        const tokenPayload = {
            id: user._id, // Usa _id do objeto lean
            username: user.username,
            role: user.role,
            empresa_id: user.empresa // Campo no schema User
        };

        const token = jwt.sign(tokenPayload, this.secretKey, { expiresIn: '1h' });

        // Retorna o token e os dados do utilizador (já é um objeto simples sem senha hash completa)
        const userResponse = { ...tokenPayload };
        return { token, user: userResponse };
    }

    async forgotPassword(email) {
        // Busca o utilizador por email
        // Adiciona .lean() pois só precisamos do _id para a atualização posterior
        const user = await User.findOne({ email: email })
                               .select('_id') // Seleciona apenas o _id
                               .lean() // <-- Adicionado .lean()
                               .exec();

        if (user) {
            const resetToken = crypto.randomBytes(32).toString('hex');
            const tokenExpiry = new Date(Date.now() + 3600000); // 1 hora

            // Atualiza o documento (updateOne não precisa do documento completo)
            await User.updateOne(
                { _id: user._id }, // Usa o _id do objeto lean
                { $set: { resetToken: resetToken, tokenExpiry: tokenExpiry } }
            );

            // TODO: Enviar o email
            console.log(`[DEV] Token de redefinição para ${email}: ${resetToken}`);
        }

        return { message: 'Se uma conta com este e-mail existir, um e-mail de redefinição foi enviado.' };
    }

    async resetPassword(token, newPassword) {
        // Busca o utilizador pelo token e expiração
        // Adiciona .lean() pois só precisamos do _id para a atualização
        const user = await User.findOne({
            resetToken: token,
            tokenExpiry: { $gt: Date.now() }
        })
        .select('_id') // Seleciona apenas o _id
        .lean() // <-- Adicionado .lean()
        .exec();

        if (!user) {
            const error = new Error('Token de redefinição inválido ou expirado.');
            error.status = 400;
            throw error;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Atualiza o documento
        await User.updateOne(
            { _id: user._id }, // Usa o _id do objeto lean
            {
                $set: {
                    password: hashedPassword,
                    resetToken: null,
                    tokenExpiry: null
                }
            }
        );

        return { message: 'Senha redefinida com sucesso!' };
    }
}

module.exports = AuthService;