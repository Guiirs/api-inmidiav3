// services/adminService.js
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Importa o modelo User do Mongoose
const logger = require('../config/logger'); // Importa o logger
const AppError = require('../utils/AppError'); // [MELHORIA] Importa o AppError
const saltRounds = 10;

class AdminService {
    constructor() {}

    /**
     * Cria um novo utilizador associado a uma empresa.
     * @param {object} userData - Dados do novo utilizador (username, email, password, nome, sobrenome, role?).
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<object>} - Objeto com os dados seguros do utilizador criado.
     * @throws {AppError} - Lança erro com status 400, 409 ou 500.
     */
    async createUser(userData, empresa_id) {
        logger.info(`[AdminService] Tentando criar utilizador para empresa ${empresa_id}.`);
        logger.debug(`[AdminService] Dados recebidos: ${JSON.stringify(userData)}`);

        const { username, email, password, nome, sobrenome, role = 'user' } = userData;

        // Validação básica (mantida)
        if (!username || !email || !password || !nome || !sobrenome) {
            // [MELHORIA] Usa AppError
            throw new AppError('Campos obrigatórios (username, email, password, nome, sobrenome) em falta.', 400);
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
                // [MELHORIA] Usa AppError
                throw new AppError(`Já existe um utilizador com este ${field} na sua empresa.`, 409);
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

            // Retorna um objeto simples e seguro (após a transformação toJSON/toObject do Mongoose)
            // A transformação global (configurada em dbMongo.js) mapeia _id -> id
            return createdUser.toJSON();

        } catch (error) {
            logger.error(`[AdminService] Erro Mongoose/DB ao criar utilizador: ${error.message}`, { stack: error.stack, code: error.code, keyValue: error.keyValue });

            // Trata erros de duplicação que podem ter escapado (mantido)
            if (error.code === 11000) {
                let field = Object.keys(error.keyValue)[0];
                field = field === 'email' ? 'e-mail' : (field === 'username' ? 'nome de utilizador' : field);
                // [MELHORIA] Usa AppError
                throw new AppError(`Já existe um utilizador com este ${field}.`, 409); 
            }
            // [MELHORIA] Se for um erro de validação (ex: password muito curta, mas validado no service/controller) ou outro erro de DB (não 400/409/500 interno)
            if (error instanceof AppError) throw error; // Relança AppErrors (ex: 400 de validação)

            // Lança um erro genérico 500 para outros erros inesperados
            throw new AppError(`Erro interno ao criar utilizador: ${error.message}`, 500);
        }
    }

    /**
     * Obtém todos os utilizadores de uma empresa.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<Array<object>>} - Array com os dados seguros dos utilizadores.
     * @throws {AppError} - Lança erro com status 500 em caso de falha na DB.
     */
    async getAllUsers(empresa_id) {
        logger.info(`[AdminService] Buscando todos os utilizadores para empresa ${empresa_id}.`);
        try {
            const users = await User.find({ empresa: empresa_id })
                                    .select('username email nome sobrenome role createdAt') // Seleciona campos seguros
                                    .lean() // Retorna objetos simples (A transformação _id -> id já deve funcionar se configurada no jest.setup.js)
                                    .exec();
            logger.info(`[AdminService] Encontrados ${users.length} utilizadores para empresa ${empresa_id}.`);
            // O mapeamento _id -> id é tratado pelo Mongoose.set('toJSON') ou jest.setup.js
            return users; 
        } catch (error) {
            logger.error(`[AdminService] Erro Mongoose/DB ao buscar todos os utilizadores: ${error.message}`, { stack: error.stack });
            // [MELHORIA] Usa AppError
            throw new AppError(`Erro interno ao buscar utilizadores: ${error.message}`, 500);
        }
    }

    /**
     * Atualiza a role ('admin' ou 'user') de um utilizador específico.
     * @param {string} userId - ObjectId do utilizador a atualizar.
     * @param {string} newRole - A nova role ('admin' ou 'user').
     * @param {string} empresa_id - ObjectId da empresa do administrador que faz a requisição.
     * @returns {Promise<object>} - Objeto com mensagem de sucesso.
     * @throws {AppError} - Lança erro com status 400, 404 ou 500.
     */
    async updateUserRole(userId, newRole, empresa_id) {
        logger.info(`[AdminService] Tentando atualizar role do utilizador ${userId} para ${newRole} na empresa ${empresa_id}.`);

        // Validação da Role
        if (!newRole || (newRole !== 'admin' && newRole !== 'user')) {
            // [MELHORIA] Usa AppError
            throw new AppError("A 'role' fornecida é inválida. Use 'admin' ou 'user'.", 400);
        }

        try {
            // Tenta encontrar e atualizar.
            const updateResult = await User.updateOne(
                { _id: userId, empresa: empresa_id }, 
                { $set: { role: newRole } }           
            );

            // Verifica se algum documento foi encontrado para atualizar
            if (updateResult.matchedCount === 0) {
                // [MELHORIA] Usa AppError
                throw new AppError('Utilizador não encontrado na sua empresa.', 404);
            }

             if (updateResult.modifiedCount === 0) {
                 logger.info(`[AdminService] Role do utilizador ${userId} já era '${newRole}'. Nenhuma alteração feita.`);
             } else {
                 logger.info(`[AdminService] Role do utilizador ${userId} atualizada com sucesso para ${newRole}.`);
             }

            return { message: 'Nível de acesso do utilizador atualizado com sucesso!' };

        } catch (error) {
            logger.error(`[AdminService] Erro Mongoose/DB ao atualizar role: ${error.message}`, { stack: error.stack });
            // [MELHORIA] Se for um AppError (400, 404), relança.
            if (error instanceof AppError) throw error; 

            // Lança um erro genérico 500
            throw new AppError(`Erro interno ao atualizar role do utilizador: ${error.message}`, 500);
        }
    }

    /**
     * Apaga um utilizador, impedindo que um admin apague a própria conta.
     * @param {string} userId - ObjectId do utilizador a ser apagado.
     * @param {string} adminUserId - ObjectId do administrador que está a fazer a requisição.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<{success: boolean}>} - Confirmação de sucesso.
     * @throws {AppError} - Lança erro com status 400, 404 ou 500.
     */
    async deleteUser(userId, adminUserId, empresa_id) {
        logger.info(`[AdminService] Admin ${adminUserId} tentando apagar utilizador ${userId} na empresa ${empresa_id}.`);

        // Verifica se o admin está a tentar apagar a si próprio
        if (String(userId) === String(adminUserId)) {
            // [MELHORIA] Usa AppError
            throw new AppError('Não é possível apagar a sua própria conta de administrador.', 400);
        }

        try {
            const result = await User.deleteOne({ _id: userId, empresa: empresa_id });

            if (result.deletedCount === 0) {
                // [MELHORIA] Usa AppError
                throw new AppError('Utilizador não encontrado na sua empresa.', 404);
            }

            logger.info(`[AdminService] Utilizador ${userId} apagado com sucesso pelo admin ${adminUserId}.`);
            return { success: true };
        } catch (error) {
            logger.error(`[AdminService] Erro Mongoose/DB ao apagar utilizador: ${error.message}`, { stack: error.stack });
            // [MELHORIA] Se for um AppError (400, 404), relança.
            if (error instanceof AppError) throw error; 

            // Lança um erro genérico 500
            throw new AppError(`Erro interno ao apagar utilizador: ${error.message}`, 500);
        }
    }
}

module.exports = AdminService;