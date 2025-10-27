// services/adminService.js
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Importa o modelo User do Mongoose
const logger = require('../config/logger'); // Importa o logger
const saltRounds = 10;

class AdminService {
    constructor() {}

    /**
     * Cria um novo utilizador associado a uma empresa.
     * @param {object} userData - Dados do novo utilizador (username, email, password, nome, sobrenome, role?).
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<object>} - Objeto com os dados seguros do utilizador criado.
     * @throws {Error} - Lança erro com status 400, 409 ou 500.
     */
    async createUser(userData, empresa_id) {
        logger.info(`[AdminService] Tentando criar utilizador para empresa ${empresa_id}.`);
        logger.debug(`[AdminService] Dados recebidos: ${JSON.stringify(userData)}`); // Cuidado ao logar senha em produção detalhada

        const { username, email, password, nome, sobrenome, role = 'user' } = userData;

        // Validação básica (poderia ser movida para validator se preferir)
        if (!username || !email || !password || !nome || !sobrenome) {
            const error = new Error('Campos obrigatórios (username, email, password, nome, sobrenome) em falta.');
            error.status = 400;
            logger.warn(`[AdminService] Falha ao criar utilizador: ${error.message}`);
            throw error;
        }

        try {
            // Verifica se já existe um utilizador com o mesmo username OU email NAQUELA empresa
            logger.debug(`[AdminService] Verificando existência prévia de username: ${username} ou email: ${email} na empresa ${empresa_id}`);
            const userExists = await User.findOne({
                empresa: empresa_id,
                $or: [{ username }, { email }]
            }).lean().exec();

            if (userExists) {
                let field = userExists.username === username ? 'nome de utilizador' : 'email';
                const error = new Error(`Já existe um utilizador com este ${field} na sua empresa.`);
                error.status = 409;
                logger.warn(`[AdminService] Falha ao criar utilizador: ${error.message}`);
                throw error;
            }

            logger.debug(`[AdminService] Hasheando senha para utilizador ${username}`);
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const newUser = new User({
                username, email, password: hashedPassword,
                nome, sobrenome, role,
                empresa: empresa_id
            });

            logger.debug(`[AdminService] Tentando salvar novo utilizador ${username} no DB.`);
            const createdUser = await newUser.save();
            logger.info(`[AdminService] Utilizador ${username} (ID: ${createdUser._id}) criado com sucesso para empresa ${empresa_id}.`);

            // Retorna um objeto simples e seguro
            return {
                id: createdUser._id, // Garante retorno do ID mapeado
                username: createdUser.username,
                email: createdUser.email,
                role: createdUser.role
            };
        } catch (error) {
            // Log detalhado do erro antes de tratar
            logger.error(`[AdminService] Erro Mongoose/DB ao criar utilizador: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

            // Trata erros de duplicação que podem ter escapado à verificação inicial ou ocorreram por race condition
            if (error.code === 11000) {
                let field = Object.keys(error.keyValue)[0];
                field = field === 'email' ? 'e-mail' : (field === 'username' ? 'nome de utilizador' : field);
                const duplicateError = new Error(`Já existe um utilizador com este ${field}.`);
                duplicateError.status = 409;
                throw duplicateError; // Lança erro específico
            }
            // Re-lança outros erros (podem ser erros de validação do Mongoose ou de conexão)
            // Considerar lançar um erro genérico 500 para mascarar detalhes internos
            const serviceError = new Error(`Erro interno ao criar utilizador: ${error.message}`);
            serviceError.status = 500; // Internal Server Error
            throw serviceError;
        }
    }

    /**
     * Obtém todos os utilizadores de uma empresa.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<Array<object>>} - Array com os dados seguros dos utilizadores.
     * @throws {Error} - Lança erro com status 500 em caso de falha na DB.
     */
    async getAllUsers(empresa_id) {
        logger.info(`[AdminService] Buscando todos os utilizadores para empresa ${empresa_id}.`);
        try {
            const users = await User.find({ empresa: empresa_id })
                                    .select('username email nome sobrenome role createdAt') // Seleciona campos seguros
                                    .lean() // Retorna objetos simples
                                    .exec();
            logger.info(`[AdminService] Encontrados ${users.length} utilizadores para empresa ${empresa_id}.`);
            return users; // O mapeamento _id -> id já deve ocorrer globalmente
        } catch (error) {
            logger.error(`[AdminService] Erro Mongoose/DB ao buscar todos os utilizadores: ${error.message}`, { stack: error.stack });
            const serviceError = new Error(`Erro interno ao buscar utilizadores: ${error.message}`);
            serviceError.status = 500;
            throw serviceError;
        }
    }

    /**
     * Atualiza a role ('admin' ou 'user') de um utilizador específico.
     * @param {string} userId - ObjectId do utilizador a atualizar.
     * @param {string} newRole - A nova role ('admin' ou 'user').
     * @param {string} empresa_id - ObjectId da empresa do administrador que faz a requisição.
     * @returns {Promise<object>} - Objeto com mensagem de sucesso.
     * @throws {Error} - Lança erro com status 400, 404 ou 500.
     */
    async updateUserRole(userId, newRole, empresa_id) {
        logger.info(`[AdminService] Tentando atualizar role do utilizador ${userId} para ${newRole} na empresa ${empresa_id}.`);

        // Validação da Role
        if (!newRole || (newRole !== 'admin' && newRole !== 'user')) {
            const error = new Error("A 'role' fornecida é inválida. Use 'admin' ou 'user'.");
            error.status = 400;
            logger.warn(`[AdminService] Falha ao atualizar role: ${error.message}`);
            throw error;
        }

        try {
            // Tenta encontrar e atualizar. { new: false } retorna o doc *antes* da atualização (ou null se não encontrar)
            const updateResult = await User.updateOne(
                { _id: userId, empresa: empresa_id }, // Critérios de busca
                { $set: { role: newRole } }           // Dados a atualizar
            );

            // Verifica se algum documento foi encontrado para atualizar
            if (updateResult.matchedCount === 0) {
                const error = new Error('Utilizador não encontrado na sua empresa.');
                error.status = 404;
                logger.warn(`[AdminService] Falha ao atualizar role: Utilizador ${userId} não encontrado na empresa ${empresa_id}.`);
                throw error;
            }

             // Verifica se o documento foi realmente modificado (opcional, mas informativo)
             if (updateResult.modifiedCount === 0) {
                 logger.info(`[AdminService] Role do utilizador ${userId} já era '${newRole}'. Nenhuma alteração feita.`);
             } else {
                 logger.info(`[AdminService] Role do utilizador ${userId} atualizada com sucesso para ${newRole}.`);
             }

            return { message: 'Nível de acesso do utilizador atualizado com sucesso!' };

        } catch (error) {
            // Log detalhado do erro
            logger.error(`[AdminService] Erro Mongoose/DB ao atualizar role: ${error.message}`, { stack: error.stack });
            // Considerar lançar um erro genérico 500
            const serviceError = new Error(`Erro interno ao atualizar role do utilizador: ${error.message}`);
            serviceError.status = 500;
            throw serviceError;
        }
    }

    /**
     * Apaga um utilizador, impedindo que um admin apague a própria conta.
     * @param {string} userId - ObjectId do utilizador a ser apagado.
     * @param {string} adminUserId - ObjectId do administrador que está a fazer a requisição.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<{success: boolean}>} - Confirmação de sucesso.
     * @throws {Error} - Lança erro com status 400, 404 ou 500.
     */
    async deleteUser(userId, adminUserId, empresa_id) {
        logger.info(`[AdminService] Admin ${adminUserId} tentando apagar utilizador ${userId} na empresa ${empresa_id}.`);

        // Verifica se o admin está a tentar apagar a si próprio
        if (String(userId) === String(adminUserId)) {
            const error = new Error('Não é possível apagar a sua própria conta de administrador.');
            error.status = 400;
            logger.warn(`[AdminService] Falha ao apagar utilizador: Admin ${adminUserId} tentou apagar a própria conta.`);
            throw error;
        }

        try {
            const result = await User.deleteOne({ _id: userId, empresa: empresa_id });

            if (result.deletedCount === 0) {
                const error = new Error('Utilizador não encontrado na sua empresa.');
                error.status = 404;
                logger.warn(`[AdminService] Falha ao apagar utilizador: Utilizador ${userId} não encontrado na empresa ${empresa_id}.`);
                throw error;
            }

            logger.info(`[AdminService] Utilizador ${userId} apagado com sucesso pelo admin ${adminUserId}.`);
            return { success: true };
        } catch (error) {
            // Log detalhado do erro
            logger.error(`[AdminService] Erro Mongoose/DB ao apagar utilizador: ${error.message}`, { stack: error.stack });
            // Considerar lançar um erro genérico 500
            const serviceError = new Error(`Erro interno ao apagar utilizador: ${error.message}`);
            serviceError.status = 500;
            throw serviceError;
        }
    }
}

module.exports = AdminService; // Exporta a classe