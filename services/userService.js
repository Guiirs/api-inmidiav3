// services/userService.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User'); // Importa o modelo User
const Empresa = require('../models/Empresa'); // Importa o modelo Empresa
const saltRounds = 10;

class UserService {
    // constructor não precisa mais do 'db'
    constructor() {}

    async getProfile(userId) {
        // Busca o utilizador pelo _id e seleciona os campos desejados
        // Adiciona .lean() para retornar um objeto simples
        const user = await User.findById(userId)
                               .select('username email nome sobrenome avatar_url') // Exclui _id se não quiser, mas é útil
                               .lean() // <-- Adicionado .lean()
                               .exec();

        if (!user) {
            const error = new Error('Utilizador não encontrado.');
            error.status = 404;
            throw error;
        }
        // A transformação toJSON global (se configurada) tratará _id -> id
        return user; // Retorna o objeto simples
    }

    async updateProfile(userId, userData) {
        const { username, email, nome, sobrenome, password, avatar_url } = userData;

        const updateData = {};
        // Adiciona campos ao objeto de atualização apenas se eles foram fornecidos
        if (username !== undefined) updateData.username = username;
        if (email !== undefined) updateData.email = email;
        if (nome !== undefined) updateData.nome = nome;
        if (sobrenome !== undefined) updateData.sobrenome = sobrenome;
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

        // Faz hash da nova senha, se fornecida
        if (password) {
            updateData.password = await bcrypt.hash(password, saltRounds);
        }

        try {
            // Encontra o utilizador pelo _id e atualiza-o, retornando o *novo* documento atualizado
            // Seleciona os campos a serem retornados após a atualização
            // NÃO usar .lean() aqui pois findByIdAndUpdate retorna o doc Mongoose por padrão com { new: true }
            const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true })
                                          .select('username email nome sobrenome avatar_url')
                                          .exec();

            if (!updatedUser) {
                const error = new Error('Utilizador não encontrado para atualização.');
                error.status = 404;
                throw error;
            }
            // A transformação toJSON global tratará _id -> id na resposta
            return updatedUser;
        } catch (error) {
             // Trata erro de chave duplicada (username ou email)
            if (error.code === 11000) {
                 let field = Object.keys(error.keyValue)[0];
                 field = field === 'email' ? 'e-mail' : (field === 'username' ? 'nome de utilizador' : field);
                 const duplicateError = new Error(`Este ${field} já está em uso.`);
                 duplicateError.status = 409;
                 throw duplicateError;
            }
            // Re-lança outros erros
            throw error;
        }
    }

    async getEmpresaProfile(empresa_id, userRole) {
        // Lógica de verificação de permissão permanece a mesma
        if (userRole !== 'admin') {
            const error = new Error('Apenas administradores podem aceder aos detalhes da empresa.');
            error.status = 403; // Forbidden
            throw error;
        }

        // Busca a empresa pelo _id e seleciona os campos desejados
        // Adiciona .lean() para retornar um objeto simples
        const empresa = await Empresa.findById(empresa_id)
                                     .select('nome api_key_prefix status_assinatura') // Seleciona os campos relevantes
                                     .lean() // <-- Adicionado .lean()
                                     .exec();

        if (!empresa) {
            const error = new Error('Empresa não encontrada.');
            error.status = 404;
            throw error;
        }
         // A transformação toJSON global (se configurada) tratará _id -> id
        return empresa; // Retorna o objeto simples
    }

    // --- NOVA FUNÇÃO ADICIONADA ---
    async regenerateApiKey(userId, empresaId, userRole, userPassword) {
        // 1. Apenas Admins podem regenerar chaves (lógica inalterada)
        if (userRole !== 'admin') {
            const error = new Error('Apenas administradores podem regenerar a chave de API.');
            error.status = 403; // Forbidden
            throw error;
        }

        // 2. Verificar a senha do administrador
        // Busca o admin pelo _id e empresa, selecionando a senha para comparação
        // Adiciona .lean() aqui, pois só precisamos da senha para comparar
        const user = await User.findOne({ _id: userId, empresa: empresaId })
                               .select('+password') // Pede a senha
                               .lean() // <-- Adicionado .lean()
                               .exec();
        if (!user) {
            // Este caso não deveria acontecer se o token JWT for válido, mas é uma verificação extra
            const error = new Error('Utilizador administrador não encontrado para esta empresa.');
            error.status = 404;
            throw error;
        }

        const passwordMatch = await bcrypt.compare(userPassword, user.password);
        if (!passwordMatch) {
            const error = new Error('Senha incorreta. Verificação falhou.');
            error.status = 401; // Unauthorized
            throw error;
        }

        // 3. Senha correta. Buscar a empresa para obter o nome (para o prefixo)
        // Adiciona .lean() aqui, pois só precisamos do nome
        const empresa = await Empresa.findById(empresaId)
                                     .select('nome') // Seleciona apenas o nome
                                     .lean() // <-- Adicionado .lean()
                                     .exec();
        if (!empresa) {
             const error = new Error('Empresa associada não encontrada.');
            error.status = 404;
            throw error;
        }

        // 4. Gerar nova chave (lógica inalterada)
        const prefixBase = empresa.nome.substring(0, 4).toLowerCase().replace(/[^a-z]/g, '') || 'emp';
        const newApiKeyPrefix = `${prefixBase}_${uuidv4().split('-')[0].substring(0, 4)}`;
        const newApiKeySecret = uuidv4();
        const newApiKeyHash = await bcrypt.hash(newApiKeySecret, saltRounds); // Use saltRounds
        const newFullApiKey = `${newApiKeyPrefix}_${newApiKeySecret}`;

        // 5. Atualizar a empresa com os novos valores usando Mongoose
        // updateOne não retorna documento, .lean() não se aplica
        const updateResult = await Empresa.updateOne(
            { _id: empresaId },
            { $set: { api_key_hash: newApiKeyHash, api_key_prefix: newApiKeyPrefix } }
        );

        // Verifica se a atualização foi bem-sucedida (opcional, mas bom)
        if (updateResult.matchedCount === 0) {
             const error = new Error('Falha ao encontrar a empresa para atualizar a API Key.');
             error.status = 404;
             throw error;
        }
         if (updateResult.modifiedCount === 0) {
             // Isso pode acontecer se os novos valores gerados forem idênticos aos antigos (muito improvável)
             console.warn(`[regenerateApiKey] A empresa ${empresaId} foi encontrada, mas a API Key não foi modificada (talvez os novos valores sejam iguais aos antigos).`);
         }


        // 6. Retornar a *nova* chave completa e o novo prefixo
        return {
            fullApiKey: newFullApiKey,
            newPrefix: newApiKeyPrefix
        };
    }
}

module.exports = UserService;