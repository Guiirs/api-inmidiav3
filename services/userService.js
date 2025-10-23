// services/userService.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid'); // Importa uuidv4
const saltRounds = 10;

class UserService {
    constructor(db) {
        this.db = db;
    }

    async getProfile(userId) {
        const user = await this.db('users')
            .where({ id: userId })
            .select('id', 'username', 'email', 'nome', 'sobrenome', 'avatar_url')
            .first();

        if (!user) {
            const error = new Error('Utilizador não encontrado.');
            error.status = 404;
            throw error;
        }
        return user;
    }

    async updateProfile(userId, userData) {
        const { username, email, nome, sobrenome, password, avatar_url } = userData;

        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (nome || nome === '') updateData.nome = nome;
        if (sobrenome || sobrenome === '') updateData.sobrenome = sobrenome;
        if (avatar_url || avatar_url === '') updateData.avatar_url = avatar_url;

        if (password) {
            updateData.password = await bcrypt.hash(password, saltRounds);
        }

        const updatedUserArray = await this.db('users')
            .where({ id: userId })
            .update(updateData)
            .returning(['id', 'username', 'email', 'nome', 'sobrenome', 'avatar_url']);

        if (!updatedUserArray || updatedUserArray.length === 0) {
            // Verifica se o utilizador existe, caso a atualização não retorne nada (nenhum dado mudou)
            const userExists = await this.db('users').where({ id: userId }).first();
            if (!userExists) {
                const error = new Error('Utilizador não encontrado para atualização.');
                error.status = 404;
                throw error;
            }
             // Se o utilizador existe mas nada mudou, retorna os dados atuais
             // Re-seleciona os campos corretos
             return await this.db('users')
                .where({ id: userId })
                .select('id', 'username', 'email', 'nome', 'sobrenome', 'avatar_url')
                .first();
        }
        
        return updatedUserArray[0];
    }

    async getEmpresaProfile(empresa_id, userRole) {
        if (userRole !== 'admin') {
            const error = new Error('Apenas administradores podem aceder aos detalhes da empresa.');
            error.status = 403;
            throw error;
        }

        const empresa = await this.db('empresas')
            .where({ id: empresa_id })
            // --- ALTERAÇÃO AQUI ---
            // Seleciona 'api_key_prefix' em vez de 'api_key'
            .select('id', 'nome', 'api_key_prefix', 'status_assinatura')
            // --- FIM DA ALTERAÇÃO ---
            .first();

        if (!empresa) {
            const error = new Error('Empresa não encontrada.');
            error.status = 404;
            throw error;
        }
        return empresa;
    }

    // --- NOVA FUNÇÃO ADICIONADA ---
    async regenerateApiKey(userId, empresaId, userRole, userPassword) {
        // 1. Apenas Admins podem regenerar chaves
        if (userRole !== 'admin') {
            const error = new Error('Apenas administradores podem regenerar a chave de API.');
            error.status = 403; // Forbidden
            throw error;
        }

        // 2. Verificar a senha do administrador que está a pedir
        const user = await this.db('users').where({ id: userId, empresa_id: empresaId }).first();
        if (!user) {
            const error = new Error('Utilizador não encontrado.');
            error.status = 404;
            throw error;
        }

        const passwordMatch = await bcrypt.compare(userPassword, user.password);
        if (!passwordMatch) {
            const error = new Error('Senha incorreta. Verificação falhou.');
            error.status = 401; // Unauthorized (ou 403)
            throw error;
        }

        // 3. Senha correta. Gerar nova chave (lógica do empresaService)
        const empresa = await this.db('empresas').where({ id: empresaId }).first();
        if (!empresa) {
             const error = new Error('Empresa associada não encontrada.');
            error.status = 404;
            throw error;
        }

        const prefixBase = empresa.nome.substring(0, 4).toLowerCase().replace(/[^a-z]/g, '') || 'emp';
        const newApiKeyPrefix = `${prefixBase}_${uuidv4().split('-')[0].substring(0, 4)}`;
        const newApiKeySecret = uuidv4();
        const newApiKeyHash = await bcrypt.hash(newApiKeySecret, 10);
        const newFullApiKey = `${newApiKeyPrefix}_${newApiKeySecret}`;

        // 4. Atualizar o banco de dados da empresa com os novos valores
        await this.db('empresas')
            .where({ id: empresaId })
            .update({
                api_key_hash: newApiKeyHash,
                api_key_prefix: newApiKeyPrefix
            });

        // 5. Retornar a *nova* chave completa e o novo prefixo
        return {
            fullApiKey: newFullApiKey,
            newPrefix: newApiKeyPrefix
        };
    }
}

module.exports = UserService;