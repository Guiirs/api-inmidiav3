// services/userService.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User'); // Importa o modelo User
const Empresa = require('../models/Empresa'); // Importa o modelo Empresa
const logger = require('../config/logger'); // Importa o logger
const saltRounds = 10;

class UserService {
    constructor() {}

    /**
     * Obtém os dados do perfil de um utilizador.
     * @param {string} userId - ObjectId do utilizador.
     * @returns {Promise<object>} - Objeto simples com os dados seguros do perfil.
     * @throws {Error} - Lança erro 404 ou 500.
     */
    async getProfile(userId) {
        logger.info(`[UserService] Buscando perfil para utilizador ID: ${userId}.`);
        try {
            // Busca o utilizador pelo _id e seleciona os campos desejados
            const user = await User.findById(userId)
                                   .select('username email nome sobrenome avatar_url') // Campos seguros
                                   .lean() // Retorna objeto simples
                                   .exec();

            if (!user) {
                const error = new Error('Utilizador não encontrado.');
                error.status = 404;
                logger.warn(`[UserService] Utilizador ID ${userId} não encontrado ao buscar perfil.`);
                throw error;
            }

            logger.info(`[UserService] Perfil do utilizador ${user.username} (ID: ${userId}) encontrado.`);
            // Mapeamento _id -> id deve ocorrer globalmente
            return user;
        } catch (error) {
            if (error.status === 404) throw error; // Relança erro 404
            // Loga e relança outros erros como 500
            logger.error(`[UserService] Erro Mongoose/DB ao buscar perfil do utilizador ${userId}: ${error.message}`, { stack: error.stack });
            const serviceError = new Error(`Erro interno ao buscar perfil: ${error.message}`);
            serviceError.status = 500;
            throw serviceError;
        }
    }

    /**
     * Atualiza os dados do perfil de um utilizador.
     * @param {string} userId - ObjectId do utilizador.
     * @param {object} userData - Dados a atualizar (username?, email?, nome?, sobrenome?, password?, avatar_url?).
     * @returns {Promise<object>} - Objeto simples com os dados atualizados do perfil.
     * @throws {Error} - Lança erro 404, 409 ou 500.
     */
    async updateProfile(userId, userData) {
        logger.info(`[UserService] Tentando atualizar perfil para utilizador ID: ${userId}.`);
        logger.debug(`[UserService] Dados recebidos para atualização: ${JSON.stringify(userData)}`); // Cuidado com senha em logs detalhados
        const { username, email, nome, sobrenome, password, avatar_url } = userData;

        const updateData = {};
        // Adiciona campos ao objeto de atualização apenas se eles foram fornecidos e não são nulos/undefined
        if (username !== undefined && username !== null) updateData.username = username.trim();
        if (email !== undefined && email !== null) updateData.email = email.trim().toLowerCase();
        if (nome !== undefined && nome !== null) updateData.nome = nome.trim();
        if (sobrenome !== undefined && sobrenome !== null) updateData.sobrenome = sobrenome.trim();
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url; // Assume que URL vazia "" ou null é intencional para limpar

        // Faz hash da nova senha, se fornecida e não vazia
        if (password && password.trim().length >= 6) { // Adiciona verificação de comprimento aqui
            logger.debug(`[UserService] Nova senha fornecida. Hasheando...`);
            updateData.password = await bcrypt.hash(password, saltRounds);
            // Opcional: Adicionar campo passwordChangedAt se usar invalidação de token JWT baseada nisso
            // updateData.passwordChangedAt = Date.now() - 1000;
        } else if (password && password.trim().length > 0) {
             const error = new Error('A nova senha deve ter no mínimo 6 caracteres.');
             error.status = 400; // Bad Request
             logger.warn(`[UserService] Falha ao atualizar perfil: ${error.message}`);
             throw error;
        }

        // Verifica se há algo para atualizar
        if (Object.keys(updateData).length === 0) {
            logger.info(`[UserService] Nenhuma alteração fornecida para o perfil do utilizador ${userId}. Retornando perfil atual.`);
            // Se não há nada para mudar, apenas retorna os dados atuais
            return await this.getProfile(userId); // Reutiliza a função getProfile
        }


        try {
            logger.debug(`[UserService] Tentando encontrar e atualizar utilizador ID ${userId} no DB com dados: ${JSON.stringify(updateData)}`); // Não loga senha hasheada
            // Encontra e atualiza, retornando o *novo* documento atualizado
            // runValidators: true -> executa validações do schema Mongoose (ex: email, min/max length)
            const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true })
                                          .select('username email nome sobrenome avatar_url') // Seleciona campos seguros para retorno
                                          .lean() // Retorna objeto simples
                                          .exec();

            if (!updatedUser) {
                // Embora findByIdAndUpdate lance CastError para ID inválido, verificamos explicitamente
                const error = new Error('Utilizador não encontrado para atualização.');
                error.status = 404;
                logger.warn(`[UserService] Utilizador ID ${userId} não encontrado durante findByIdAndUpdate.`);
                throw error;
            }
            logger.info(`[UserService] Perfil do utilizador ${updatedUser.username} (ID: ${userId}) atualizado com sucesso.`);
            // Mapeamento _id -> id deve ocorrer globalmente
            return updatedUser;
        } catch (error) {
             // Log detalhado do erro
            logger.error(`[UserService] Erro Mongoose/DB ao atualizar perfil do utilizador ${userId}: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

             // Trata erro de chave duplicada (username ou email)
            if (error.code === 11000) {
                 let field = Object.keys(error.keyValue)[0];
                 field = field === 'email' ? 'e-mail' : (field === 'username' ? 'nome de utilizador' : field);
                 const duplicateError = new Error(`Este ${field} já está em uso.`);
                 duplicateError.status = 409;
                 throw duplicateError;
            }
             // Relança erros 400/404 ou outros como 500
            if (error.status === 400 || error.status === 404) throw error;
            // Erros de validação do Mongoose (ativados por runValidators: true) também podem cair aqui
            if (error.name === 'ValidationError') {
                 // Extrai a primeira mensagem de erro de validação do Mongoose
                 const firstErrorMessage = Object.values(error.errors)[0].message;
                 const validationError = new Error(`Erro de validação: ${firstErrorMessage}`);
                 validationError.status = 400;
                 throw validationError;
            }
            const serviceError = new Error(`Erro interno ao atualizar perfil: ${error.message}`);
            serviceError.status = 500;
            throw serviceError;
        }
    }

    /**
     * Obtém os dados da empresa associada ao utilizador (apenas para admins).
     * @param {string} empresa_id - ObjectId da empresa.
     * @param {string} userRole - Role do utilizador que faz a requisição ('admin' ou 'user').
     * @returns {Promise<object>} - Objeto simples com os dados da empresa (nome, prefixo API, status).
     * @throws {Error} - Lança erro 403, 404 ou 500.
     */
    async getEmpresaProfile(empresa_id, userRole) {
        logger.info(`[UserService] Utilizador (Role: ${userRole}) buscando perfil da empresa ID: ${empresa_id}.`);

        // Verifica permissão
        if (userRole !== 'admin') {
            const error = new Error('Apenas administradores podem aceder aos detalhes da empresa.');
            error.status = 403; // Forbidden
            logger.warn(`[UserService] Acesso negado para buscar perfil da empresa ${empresa_id} por utilizador não admin.`);
            throw error;
        }

        try {
            // Busca a empresa pelo _id e seleciona os campos desejados
            logger.debug(`[UserService] Buscando empresa ID ${empresa_id} no DB.`);
            const empresa = await Empresa.findById(empresa_id)
                                         .select('nome api_key_prefix status_assinatura') // Campos relevantes e seguros
                                         .lean() // Retorna objeto simples
                                         .exec();

            if (!empresa) {
                const error = new Error('Empresa não encontrada.');
                error.status = 404;
                logger.warn(`[UserService] Empresa ID ${empresa_id} não encontrada ao buscar perfil.`);
                throw error;
            }

            logger.info(`[UserService] Perfil da empresa ${empresa.nome} (ID: ${empresa_id}) encontrado.`);
            // Mapeamento _id -> id deve ocorrer globalmente
            return empresa;
        } catch (error) {
            if (error.status === 404) throw error; // Relança erro 404
            // Loga e relança outros erros como 500
            logger.error(`[UserService] Erro Mongoose/DB ao buscar perfil da empresa ${empresa_id}: ${error.message}`, { stack: error.stack });
            const serviceError = new Error(`Erro interno ao buscar perfil da empresa: ${error.message}`);
            serviceError.status = 500;
            throw serviceError;
        }
    }

    /**
     * Regenera a API Key de uma empresa, verificando a senha do admin.
     * @param {string} userId - ObjectId do admin que faz a requisição.
     * @param {string} empresaId - ObjectId da empresa.
     * @param {string} userRole - Role do utilizador ('admin').
     * @param {string} userPassword - Senha atual do admin para confirmação.
     * @returns {Promise<{fullApiKey: string, newPrefix: string}>} - Nova chave completa e novo prefixo.
     * @throws {Error} - Lança erro 403, 401, 404 ou 500.
     */
    async regenerateApiKey(userId, empresaId, userRole, userPassword) {
        logger.info(`[UserService] Utilizador ${userId} (Role: ${userRole}) tentando regenerar API Key para empresa ${empresaId}.`);

        // 1. Apenas Admins podem regenerar chaves
        if (userRole !== 'admin') {
            const error = new Error('Apenas administradores podem regenerar a chave de API.');
            error.status = 403; // Forbidden
            logger.warn(`[UserService] Tentativa de regenerar API Key negada para utilizador ${userId} (não admin).`);
            throw error;
        }

        // Validação básica da senha
        if (!userPassword) {
            const error = new Error('A senha atual é obrigatória para regenerar a chave.');
            error.status = 400; // Bad Request
            logger.warn(`[UserService] Falha ao regenerar API Key: Senha em falta.`);
            throw error;
        }

        try {
            // 2. Verificar a senha do administrador
            logger.debug(`[UserService] Verificando senha do admin ${userId}.`);
            const user = await User.findOne({ _id: userId, empresa: empresaId })
                                   .select('+password') // Pede a senha
                                   .lean() // Objeto simples é suficiente
                                   .exec();
            if (!user) {
                const error = new Error('Utilizador administrador não encontrado para esta empresa.');
                error.status = 404; // Ou 403 Forbidden? 404 parece mais adequado
                logger.error(`[UserService] Utilizador admin ID ${userId} não encontrado para empresa ${empresaId} durante regeneração de chave.`);
                throw error;
            }

            const passwordMatch = await bcrypt.compare(userPassword, user.password);
            if (!passwordMatch) {
                const error = new Error('Senha incorreta. Verificação falhou.');
                error.status = 401; // Unauthorized
                logger.warn(`[UserService] Senha incorreta fornecida pelo admin ${userId} ao tentar regenerar API Key.`);
                throw error;
            }
            logger.debug(`[UserService] Senha do admin ${userId} verificada com sucesso.`);


            // 3. Buscar a empresa para obter o nome (para o prefixo)
            logger.debug(`[UserService] Buscando empresa ${empresaId} para obter nome.`);
            const empresa = await Empresa.findById(empresaId)
                                         .select('nome') // Apenas o nome
                                         .lean()
                                         .exec();
            if (!empresa) {
                 const error = new Error('Empresa associada não encontrada.');
                 error.status = 404;
                 logger.error(`[UserService] Empresa ${empresaId} não encontrada durante regeneração de chave.`);
                 throw error;
            }

            // 4. Gerar nova chave
            logger.debug(`[UserService] Gerando nova API Key para empresa ${empresa.nome}.`);
            const prefixBase = empresa.nome.substring(0, 4).toLowerCase().replace(/[^a-z]/g, '') || 'emp';
            const newApiKeyPrefix = `${prefixBase}_${uuidv4().split('-')[0].substring(0, 4)}`;
            const newApiKeySecret = uuidv4();
            const newApiKeyHash = await bcrypt.hash(newApiKeySecret, saltRounds);
            const newFullApiKey = `${newApiKeyPrefix}_${newApiKeySecret}`;
            logger.debug(`[UserService] Nova API Key gerada com prefixo: ${newApiKeyPrefix}.`);


            // 5. Atualizar a empresa com os novos valores
            logger.debug(`[UserService] Atualizando empresa ${empresaId} com nova API Key hash e prefixo.`);
            const updateResult = await Empresa.updateOne(
                { _id: empresaId },
                { $set: { api_key_hash: newApiKeyHash, api_key_prefix: newApiKeyPrefix } }
            );

            // Verifica se a atualização foi bem-sucedida
            if (updateResult.matchedCount === 0) {
                 // Redundante, mas seguro
                 const error = new Error('Falha ao encontrar a empresa para atualizar a API Key.');
                 error.status = 404;
                 logger.error(`[UserService] Empresa ${empresaId} não encontrada durante updateOne para API Key.`);
                 throw error;
            }
            if (updateResult.modifiedCount === 0) {
                 logger.warn(`[UserService] Empresa ${empresaId} encontrada, mas API Key não foi modificada (talvez novos valores sejam iguais aos antigos).`);
            }
            logger.info(`[UserService] API Key para empresa ${empresaId} regenerada com sucesso por admin ${userId}.`);


            // 6. Retornar a *nova* chave completa e o novo prefixo
            return {
                fullApiKey: newFullApiKey,
                newPrefix: newApiKeyPrefix
            };
        } catch (error) {
            // Relança erros específicos já tratados (400, 401, 403, 404)
            if (error.status) throw error;
            // Loga e relança outros erros como 500
            logger.error(`[UserService] Erro inesperado ao regenerar API Key para empresa ${empresaId}: ${error.message}`, { stack: error.stack });
            const serviceError = new Error(`Erro interno ao regenerar chave API: ${error.message}`);
            serviceError.status = 500;
            throw serviceError;
        }
    }
}

module.exports = UserService; // Exporta a classe