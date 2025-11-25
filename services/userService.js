// services/userService.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User'); // Importa o modelo User
const Empresa = require('../models/Empresa'); // Importa o modelo Empresa
const logger = require('../config/logger'); // Importa o logger
const AppError = require('../utils/AppError'); // [MELHORIA] Importa o AppError
const saltRounds = 10;

class UserService {
    constructor() {}

    /**
     * Obtém os dados do perfil de um utilizador.
     * @param {string} userId - ObjectId do utilizador.
     * @returns {Promise<object>} - Objeto simples com os dados seguros do perfil.
     * @throws {AppError} - Lança erro 404 ou 500.
     */
    async getProfile(userId) {
        logger.info(`[UserService] Buscando perfil para utilizador ID: ${userId}.`);
        try {
            // Busca o utilizador pelo _id e seleciona os campos desejados
            const user = await User.findById(userId)
                                   .select('username email nome sobrenome avatar_url')
                                   .lean() // Retorna objeto simples
                                   .exec();

            if (!user) {
                // [MELHORIA] Usa AppError
                throw new AppError('Utilizador não encontrado.', 404);
            }

            logger.info(`[UserService] Perfil do utilizador ${user.username} (ID: ${userId}) encontrado.`);
            // O mapeamento _id -> id é tratado pela configuração global (no Jest/DB)
            return user;
        } catch (error) {
            // [MELHORIA] Relança AppErrors (404) ou lança 500
            if (error instanceof AppError) throw error;
            logger.error(`[UserService] Erro Mongoose/DB ao buscar perfil do utilizador ${userId}: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro interno ao buscar perfil: ${error.message}`, 500);
        }
    }

    /**
     * Atualiza os dados do perfil de um utilizador.
     * @param {string} userId - ObjectId do utilizador.
     * @param {object} userData - Dados a atualizar (username?, email?, nome?, sobrenome?, password?, avatar_url?).
     * @returns {Promise<object>} - Objeto simples com os dados atualizados do perfil.
     * @throws {AppError} - Lança erro 400, 404, 409 ou 500.
     */
    async updateProfile(userId, userData) {
        logger.info(`[UserService] Tentando atualizar perfil para utilizador ID: ${userId}.`);
        const { username, email, nome, sobrenome, password, avatar_url } = userData;

        const updateData = {};
        if (username !== undefined && username !== null) updateData.username = username.trim();
        if (email !== undefined && email !== null) updateData.email = email.trim().toLowerCase();
        if (nome !== undefined && nome !== null) updateData.nome = nome.trim();
        if (sobrenome !== undefined && sobrenome !== null) updateData.sobrenome = sobrenome.trim();
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

        // Faz hash da nova senha, se fornecida e não vazia
        if (password && password.trim().length >= 6) {
            updateData.password = await bcrypt.hash(password, saltRounds);
        } else if (password && password.trim().length > 0) {
             // [MELHORIA] Usa AppError
             throw new AppError('A nova senha deve ter no mínimo 6 caracteres.', 400);
        }

        // Verifica se há algo para atualizar
        if (Object.keys(updateData).length === 0) {
            return await this.getProfile(userId); 
        }

        try {
            // Encontra e atualiza, retornando o *novo* documento atualizado
            const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true })
                                          .select('username email nome sobrenome avatar_url')
                                          .lean()
                                          .exec();

            if (!updatedUser) {
                // [MELHORIA] Usa AppError
                throw new AppError('Utilizador não encontrado para atualização.', 404);
            }
            logger.info(`[UserService] Perfil do utilizador ${updatedUser.username} (ID: ${userId}) atualizado com sucesso.`);
            return updatedUser;
        } catch (error) {
             logger.error(`[UserService] Erro Mongoose/DB ao atualizar perfil do utilizador ${userId}: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

             // Trata erro de chave duplicada (username ou email)
            if (error.code === 11000) {
                 let field = Object.keys(error.keyValue)[0];
                 field = field === 'email' ? 'e-mail' : (field === 'username' ? 'nome de utilizador' : field);
                 // [MELHORIA] Usa AppError
                 throw new AppError(`Este ${field} já está em uso.`, 409);
            }
             
            // Trata erros de validação do Mongoose
            if (error.name === 'ValidationError') {
                 const firstErrorMessage = Object.values(error.errors)[0].message;
                 // [MELHORIA] Usa AppError
                 throw new AppError(`Erro de validação: ${firstErrorMessage}`, 400);
            }
             
            // [MELHORIA] Relança AppErrors (400, 404, 409) ou lança 500
            if (error instanceof AppError) throw error;
            throw new AppError(`Erro interno ao atualizar perfil: ${error.message}`, 500);
        }
    }

    /**
     * Obtém os dados da empresa associada ao utilizador (apenas para admins).
     * @param {string} empresa_id - ObjectId da empresa.
     * @param {string} userRole - Role do utilizador que faz a requisição ('admin' ou 'user').
     * @returns {Promise<object>} - Objeto simples com os dados da empresa (nome, prefixo API, status).
     * @throws {AppError} - Lança erro 403, 404 ou 500.
     */
    async getEmpresaProfile(empresa_id, userRole) {
        logger.info(`[UserService] Utilizador (Role: ${userRole}) buscando perfil da empresa ID: ${empresa_id}.`);

        // Verifica permissão
        if (userRole !== 'admin') {
            // [MELHORIA] Usa AppError
            throw new AppError('Apenas administradores podem aceder aos detalhes da empresa.', 403);
        }

        try {
            // Busca a empresa
            const empresa = await Empresa.findById(empresa_id)
                                         .select('nome api_key_prefix status_assinatura')
                                         .lean()
                                         .exec();

            if (!empresa) {
                // [MELHORIA] Usa AppError
                throw new AppError('Empresa não encontrada.', 404);
            }

            logger.info(`[UserService] Perfil da empresa ${empresa.nome} (ID: ${empresa_id}) encontrado.`);
            return empresa;
        } catch (error) {
            // [MELHORIA] Relança AppErrors (403, 404) ou lança 500
            if (error instanceof AppError) throw error;
            logger.error(`[UserService] Erro Mongoose/DB ao buscar perfil da empresa ${empresa_id}: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro interno ao buscar perfil da empresa: ${error.message}`, 500);
        }
    }

    /**
     * Regenera a API Key de uma empresa, verificando a senha do admin.
     * @param {string} userId - ObjectId do admin que faz a requisição.
     * @param {string} empresaId - ObjectId da empresa.
     * @param {string} userRole - Role do utilizador ('admin').
     * @param {string} userPassword - Senha atual do admin para confirmação.
     * @returns {Promise<{fullApiKey: string, newPrefix: string}>} - Nova chave completa e novo prefixo.
     * @throws {AppError} - Lança erro 403, 401, 404 ou 500.
     */
    async regenerateApiKey(userId, empresaId, userRole, userPassword, auditData = {}) {
        logger.info(`[UserService] Utilizador ${userId} (Role: ${userRole}) tentando regenerar API Key para empresa ${empresaId}.`);

        // 1. Apenas Admins podem regenerar chaves
        if (userRole !== 'admin') {
            // [MELHORIA] Usa AppError
            throw new AppError('Apenas administradores podem regenerar a chave de API.', 403);
        }

        // Validação básica da senha (complementa a validação da rota)
        if (!userPassword) {
            // [MELHORIA] Usa AppError
            throw new AppError('A senha atual é obrigatória para regenerar a chave.', 400);
        }

        try {
            // 2. Verificar a senha do administrador
            const user = await User.findOne({ _id: userId, empresa: empresaId })
                                   .select('+password') 
                                   .lean()
                                   .exec();
            if (!user) {
                // [MELHORIA] Usa AppError
                throw new AppError('Utilizador administrador não encontrado para esta empresa.', 404);
            }

            const passwordMatch = await bcrypt.compare(userPassword, user.password);
            if (!passwordMatch) {
                // [MELHORIA] Usa AppError
                throw new AppError('Senha incorreta. Verificação falhou.', 401);
            }
            logger.debug(`[UserService] Senha do admin ${userId} verificada com sucesso.`);


            // 3. Buscar a empresa (não lean, para poder salvar depois)
            const empresa = await Empresa.findById(empresaId).exec();
            if (!empresa) {
                 // [MELHORIA] Usa AppError
                 throw new AppError('Empresa associada não encontrada.', 404);
            }

            // 4. Gerar nova chave (lógica mantida)
            const prefixBase = empresa.nome.substring(0, 4).toLowerCase().replace(/[^a-z]/g, '') || 'emp';
            const newApiKeyPrefix = `${prefixBase}_${uuidv4().split('-')[0].substring(0, 4)}`;
            const newApiKeySecret = uuidv4();
            const newApiKeyHash = await bcrypt.hash(newApiKeySecret, saltRounds);
            const newFullApiKey = `${newApiKeyPrefix}_${newApiKeySecret}`;

            // 5. Atualizar a empresa com os novos valores
            empresa.api_key_hash = newApiKeyHash;
            empresa.api_key_prefix = newApiKeyPrefix;

            // 6. Adicionar registro de auditoria
            empresa.api_key_history.push({
                regenerated_by: userId,
                regenerated_at: new Date(),
                ip_address: auditData.ip_address || null,
                user_agent: auditData.user_agent || null
            });

            await empresa.save();
            
            logger.info(`[UserService] API Key para empresa ${empresaId} regenerada com sucesso por admin ${userId}.`);


            // 6. Retornar a *nova* chave completa e o novo prefixo
            return {
                fullApiKey: newFullApiKey,
                newPrefix: newApiKeyPrefix
            };
        } catch (error) {
            // [MELHORIA] Relança AppErrors (400, 401, 403, 404) ou lança 500
            if (error instanceof AppError) throw error;
            logger.error(`[UserService] Erro inesperado ao regenerar API Key para empresa ${empresaId}: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro interno ao regenerar chave API: ${error.message}`, 500);
        }
    }
}

module.exports = UserService;