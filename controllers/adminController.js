// controllers/adminController.js
const AdminService = require('../services/adminService'); // Importa o serviço Mongoose
// const db = require('../config/database'); // <-- Remova esta linha

    const createAdminController = () => {
    const controller = {};
    // Instancia o serviço sem passar 'db'
    const adminService = new AdminService(); // <-- Alteração aqui

    controller.createUser = async (req, res, next) => {
        try {
            const empresa_id = req.user.empresa_id; // ID da empresa do admin logado
            // Chama o serviço refatorado
            const createdUser = await adminService.createUser(req.body, empresa_id);
             // O serviço já retorna um objeto seguro { id: _id, username, email, role }
            res.status(201).json(createdUser);
        } catch (err) {
            next(err); // Passa erros (409) para o errorHandler
        }
    };

    controller.getAllUsers = async (req, res, next) => {
        try {
            const empresa_id = req.user.empresa_id;
            // Chama o serviço refatorado
            const users = await adminService.getAllUsers(empresa_id);
            // O serviço já retorna a lista formatada (sem senhas)
            res.status(200).json(users);
        } catch (err) {
            next(err);
        }
    };

    controller.updateUserRole = async (req, res, next) => {
        try {
            const { id } = req.params; // ID (_id) do utilizador a ser atualizado
            const { role } = req.body; // Nova role
            const empresa_id = req.user.empresa_id; // Empresa do admin
            // Chama o serviço refatorado
            const result = await adminService.updateUserRole(id, role, empresa_id);
            res.status(200).json(result); // Serviço retorna { message: '...' }
        } catch (err) {
            next(err); // Passa erros (400, 404) para o errorHandler
        }
    };

    controller.deleteUser = async (req, res, next) => {
        try {
            const { id } = req.params; // ID (_id) do utilizador a ser apagado
            const adminUserId = req.user.id; // ID (_id) do admin fazendo a requisição
            const empresa_id = req.user.empresa_id; // Empresa do admin
            // Chama o serviço refatorado
            await adminService.deleteUser(id, adminUserId, empresa_id);
            res.status(204).send(); // No Content
        } catch (err) {
            next(err); // Passa erros (400, 404) para o errorHandler
        }
    };

    return controller;
};

module.exports = createAdminController();