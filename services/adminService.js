// services/adminService.js
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Importa o modelo User do Mongoose
const saltRounds = 10;

class AdminService {
    // constructor não precisa mais do 'db'
    constructor() {}

    async createUser(userData, empresa_id) {
        const { username, email, password, nome, sobrenome, role = 'user' } = userData;

        // Verifica se já existe um utilizador com o mesmo username OU email NAQUELA empresa
        const userExists = await User.findOne({
            empresa: empresa_id, // Filtra pela empresa
            $or: [{ username }, { email }] // Verifica username OU email
        });

        if (userExists) {
            // Determina qual campo causou o conflito para a mensagem de erro
            let field = userExists.username === username ? 'nome de utilizador' : 'email';
            const error = new Error(`Já existe um utilizador com este ${field} na sua empresa.`);
            error.status = 409;
            throw error;
        }

        // Faz hash da senha
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Cria o novo utilizador usando o modelo Mongoose
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            nome,
            sobrenome,
            role,
            empresa: empresa_id // Associa à empresa
        });

        try {
            // Salva o novo utilizador no MongoDB
            const createdUser = await newUser.save();

            // Retorna os dados relevantes (sem a senha)
            return {
                id: createdUser._id, // Usa _id do MongoDB
                username: createdUser.username,
                email: createdUser.email,
                role: createdUser.role
            };
        } catch (error) {
            // Trata erros (incluindo possíveis erros de validação do Mongoose ou duplicação não capturada antes)
            if (error.code === 11000) {
                 let field = Object.keys(error.keyValue)[0];
                 field = field === 'email' ? 'e-mail' : (field === 'username' ? 'nome de utilizador' : field);
                 const duplicateError = new Error(`Já existe um utilizador com este ${field}.`);
                 duplicateError.status = 409;
                 throw duplicateError;
            }
            // Re-lança outros erros
            throw error;
        }
    }

    async getAllUsers(empresa_id) {
        // Busca todos os utilizadores da empresa, selecionando campos específicos
        // O Mongoose retorna _id por padrão, então selecionamos os outros campos desejados.
        // O campo 'password' é excluído por padrão se não for selecionado explicitamente.
        // Adicionamos 'createdAt' para similaridade com o código Knex.
        return await User.find({ empresa: empresa_id })
                         .select('username email nome sobrenome role createdAt') // Seleciona campos
                         .exec(); // Executa a query
    }

    async updateUserRole(userId, newRole, empresa_id) {
        // Valida a role
        if (!newRole || (newRole !== 'admin' && newRole !== 'user')) {
            const error = new Error("A 'role' fornecida é inválida. Use 'admin' ou 'user'.");
            error.status = 400;
            throw error;
        }

        // Encontra e atualiza o utilizador pelo _id e empresa_id
        const updatedUser = await User.findOneAndUpdate(
            { _id: userId, empresa: empresa_id }, // Critérios de busca
            { $set: { role: newRole } }, // Dados a atualizar
            { new: false } // Opção: 'new: true' retornaria o documento atualizado, 'false' (ou omitido) retorna o original antes da atualização
                          // Usamos false para verificar se existia ANTES de atualizar
        ).exec();

        // Verifica se o utilizador foi encontrado (updatedUser será null se não encontrado)
        if (!updatedUser) {
            const error = new Error('Utilizador não encontrado na sua empresa.');
            error.status = 404;
            throw error;
        }

        // Retorna mensagem de sucesso
        return { message: 'Nível de acesso do utilizador atualizado com sucesso!' };
    }

    async deleteUser(userId, adminUserId, empresa_id) {
        // Converte IDs para string para comparação segura (ObjectIds não comparam diretamente com ===)
        if (String(userId) === String(adminUserId)) {
            const error = new Error('Não é possível apagar a sua própria conta de administrador.');
            error.status = 400;
            throw error;
        }

        // Encontra e apaga o utilizador pelo _id e empresa_id
        const result = await User.deleteOne({ _id: userId, empresa: empresa_id }).exec();

        // Verifica se algum documento foi apagado (result.deletedCount será 0 se não encontrado)
        if (result.deletedCount === 0) {
            const error = new Error('Utilizador não encontrado na sua empresa.');
            error.status = 404;
            throw error;
        }

        // Retorna sucesso (sem conteúdo, como na API REST)
        return { success: true };
    }
}

module.exports = AdminService;