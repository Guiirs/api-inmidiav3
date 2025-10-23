// services/adminService.js
const bcrypt = require('bcrypt');
const saltRounds = 10;

class AdminService {
    constructor(db) {
        this.db = db;
    }

    async createUser(userData, empresa_id) {
        const { username, email, password, nome, sobrenome, role = 'user' } = userData;

        const userExists = await this.db('users')
            .where({ empresa_id })
            .andWhere(function() {
                this.where({ username }).orWhere({ email });
            })
            .first();

        if (userExists) {
            const error = new Error('Já existe um utilizador com este username ou email na sua empresa.');
            error.status = 409;
            throw error;
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newUser = {
            username, email, password: hashedPassword,
            nome, sobrenome, role,
            empresa_id // Associa o novo utilizador à empresa do admin
        };

        const [createdUser] = await this.db('users').insert(newUser).returning(['id', 'username', 'email', 'role']);
        return createdUser;
    }

    async getAllUsers(empresa_id) {
        return await this.db('users')
            .select('id', 'username', 'email', 'nome', 'sobrenome', 'role', 'created_at')
            .where({ empresa_id });
    }

    async updateUserRole(userId, newRole, empresa_id) {
        if (!newRole || (newRole !== 'admin' && newRole !== 'user')) {
            const error = new Error("A 'role' fornecida é inválida. Use 'admin' ou 'user'.");
            error.status = 400;
            throw error;
        }

        const count = await this.db('users').where({ id: userId, empresa_id }).update({ role: newRole });
        if (count === 0) {
            const error = new Error('Utilizador não encontrado na sua empresa.');
            error.status = 404;
            throw error;
        }
        return { message: 'Nível de acesso do utilizador atualizado com sucesso!' };
    }

    async deleteUser(userId, adminUserId, empresa_id) {
        if (parseInt(userId, 10) === adminUserId) {
            const error = new Error('Não é possível apagar a sua própria conta de administrador.');
            error.status = 400;
            throw error;
        }

        const count = await this.db('users').where({ id: userId, empresa_id }).del();
        if (count === 0) {
            const error = new Error('Utilizador não encontrado na sua empresa.');
            error.status = 404;
            throw error;
        }
        return { success: true };
    }
}

module.exports = AdminService;