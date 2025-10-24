// services/adminService.js
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Importa o modelo User do Mongoose
const saltRounds = 10;

class AdminService {
    constructor() {}

    async createUser(userData, empresa_id) {
        const { username, email, password, nome, sobrenome, role = 'user' } = userData;

        // Verifica se já existe um utilizador com o mesmo username OU email NAQUELA empresa
        // Adiciona .lean() aqui pois só precisamos verificar a existência
        const userExists = await User.findOne({
            empresa: empresa_id,
            $or: [{ username }, { email }]
        }).lean().exec(); // <-- Adicionado .lean()

        if (userExists) {
            let field = userExists.username === username ? 'nome de utilizador' : 'email';
            const error = new Error(`Já existe um utilizador com este ${field} na sua empresa.`);
            error.status = 409;
            throw error;
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new User({
            username, email, password: hashedPassword,
            nome, sobrenome, role,
            empresa: empresa_id
        });

        try {
            // .save() opera no documento Mongoose, NÃO usar .lean() antes
            const createdUser = await newUser.save();
            // A transformação toJSON global (se configurada) tratará _id -> id
            // Retorna um objeto simples manualmente se a transformação global não for usada
             return {
                 id: createdUser._id, // Garante retorno do ID mapeado
                 username: createdUser.username,
                 email: createdUser.email,
                 role: createdUser.role
             };
            // return createdUser; // Se a transformação global estiver ativa
        } catch (error) {
             // Trata erros de duplicação
             if (error.code === 11000) {
                 let field = Object.keys(error.keyValue)[0];
                 field = field === 'email' ? 'e-mail' : (field === 'username' ? 'nome de utilizador' : field);
                 const duplicateError = new Error(`Já existe um utilizador com este ${field}.`);
                 duplicateError.status = 409;
                 throw duplicateError;
             }
            throw error; // Re-lança outros erros
        }
    }

    async getAllUsers(empresa_id) {
        // Busca todos os utilizadores da empresa, selecionando campos específicos
        // Adiciona .lean() para performance
        return await User.find({ empresa: empresa_id })
                         .select('username email nome sobrenome role createdAt') // Seleciona campos
                         .lean() // <-- Adicionado .lean()
                         .exec(); // Executa a query
        // O resultado já será um array de objetos simples com _id (ou id se a transformação global estiver ativa)
    }

    async updateUserRole(userId, newRole, empresa_id) {
        if (!newRole || (newRole !== 'admin' && newRole !== 'user')) {
            const error = new Error("A 'role' fornecida é inválida. Use 'admin' ou 'user'.");
            error.status = 400;
            throw error;
        }

        // findOneAndUpdate retorna o documento (antes ou depois, dependendo de 'new')
        // NÃO usar .lean() aqui se precisar do documento Mongoose retornado
        // Se usar { new: false } (padrão), pode adicionar .lean() se só precisar verificar a existência prévia
        const updatedUserCheck = await User.findOneAndUpdate(
            { _id: userId, empresa: empresa_id },
            { $set: { role: newRole } },
            // { new: false, lean: true } // Opção para retornar objeto simples *antes* da atualização
            { new: false } // Padrão, retorna doc Mongoose antes da atualização
        ).exec();

        if (!updatedUserCheck) { // Se não encontrou o documento antes de atualizar
            const error = new Error('Utilizador não encontrado na sua empresa.');
            error.status = 404;
            throw error;
        }

        return { message: 'Nível de acesso do utilizador atualizado com sucesso!' };
    }

    async deleteUser(userId, adminUserId, empresa_id) {
        // Converte IDs para string para comparação segura
        if (String(userId) === String(adminUserId)) {
            const error = new Error('Não é possível apagar a sua própria conta de administrador.');
            error.status = 400;
            throw error;
        }

        // deleteOne não retorna o documento, .lean() não se aplica
        const result = await User.deleteOne({ _id: userId, empresa: empresa_id }).exec();

        if (result.deletedCount === 0) {
            const error = new Error('Utilizador não encontrado na sua empresa.');
            error.status = 404;
            throw error;
        }
        return { success: true };
    }
}

module.exports = AdminService;