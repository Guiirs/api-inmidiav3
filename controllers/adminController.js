// controllers/adminController.js
const AdminService = require('../services/adminService'); // Importa o novo serviço
const db = require('../config/database');

    const createAdminController = () => {
    const controller = {};
    const adminService = new AdminService(db); 
    // Cria uma instância do serviço
   

    controller.createUser = async (req, res, next) => {
        try {
            const empresa_id = req.user.empresa_id;
            const createdUser = await adminService.createUser(req.body, empresa_id);
            res.status(201).json(createdUser);
        } catch (err) {
            next(err);
        }
    };

    controller.getAllUsers = async (req, res, next) => {
        try {
            const empresa_id = req.user.empresa_id;
            const users = await adminService.getAllUsers(empresa_id);
            res.status(200).json(users);
        } catch (err) {
            next(err);
        }
    };

    controller.updateUserRole = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { role } = req.body;
            const empresa_id = req.user.empresa_id;
            const result = await adminService.updateUserRole(id, role, empresa_id);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    };

    controller.deleteUser = async (req, res, next) => {
        try {
            const { id } = req.params;
            const adminUserId = req.user.id;
            const empresa_id = req.user.empresa_id;
            await adminService.deleteUser(id, adminUserId, empresa_id);
            res.status(204).send();
        } catch (err) {
            next(err);
        }
    };

    return controller;
};

// Exporta o resultado da função, ou seja, o próprio objeto controller
module.exports = createAdminController();
