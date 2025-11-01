// controllers/adminController.js
const AdminService = require('../services/adminService'); 
const logger = require('../config/logger');
// const { validationResult } = require('express-validator'); // Não é mais necessário

// Instancia o serviço fora das funções do controller para reutilização
const adminService = new AdminService();

/**
 * Controller para criar um novo utilizador (apenas Admin).
 */
exports.createUser = async (req, res, next) => {
    // [MELHORIA] Remove verificação de autenticação/empresaId. 
    // Confia que authMiddleware e adminAuthMiddleware já validaram a requisição.
    const empresaId = req.user.empresaId; // Usa empresaId (camelCase) do token
    const adminUserId = req.user.id; 

    logger.info(`[AdminController] Admin ${adminUserId} requisitou createUser para empresa ${empresaId}.`);
    logger.debug(`[AdminController] Dados recebidos para createUser (parcial): { username: ${req.body.username}, email: ${req.body.email}, role: ${req.body.role} }`); 

    // [MELHORIA] Remove a verificação de validationResult (agora na rota)
    
    try {
        const createdUser = await adminService.createUser(req.body, empresaId);

        logger.info(`[AdminController] Utilizador ${createdUser.username} (ID: ${createdUser.id}) criado com sucesso por admin ${adminUserId}.`);
        res.status(201).json(createdUser);
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[AdminController] Erro ao chamar adminService.createUser: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * Controller para obter todos os utilizadores da empresa (apenas Admin).
 */
exports.getAllUsers = async (req, res, next) => {
    // [MELHORIA] Remove verificação redundante.
    const empresaId = req.user.empresaId;
    const adminUserId = req.user.id;

    logger.info(`[AdminController] Admin ${adminUserId} requisitou getAllUsers para empresa ${empresaId}.`);

    try {
        const users = await adminService.getAllUsers(empresaId);
        logger.info(`[AdminController] getAllUsers retornou ${users.length} utilizadores para empresa ${empresaId}.`);
        res.status(200).json(users);
    } catch (err) {
        logger.error(`[AdminController] Erro ao chamar adminService.getAllUsers: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * Controller para atualizar a role de um utilizador (apenas Admin).
 */
exports.updateUserRole = async (req, res, next) => {
    // [MELHORIA] Remove verificação redundante.
    const empresaId = req.user.empresaId; 
    const adminUserId = req.user.id;
    const { id: userIdToUpdate } = req.params;
    const { role: newRole } = req.body;

    logger.info(`[AdminController] Admin ${adminUserId} requisitou updateUserRole para utilizador ${userIdToUpdate} na empresa ${empresaId}. Nova role: ${newRole}`);
    
    // [MELHORIA] Validação do ID e do Body agora são feitas na rota (Passo 05)

    try {
        const result = await adminService.updateUserRole(userIdToUpdate, newRole, empresaId);
        logger.info(`[AdminController] updateUserRole para utilizador ${userIdToUpdate} concluído com sucesso.`);
        res.status(200).json(result);
    } catch (err) {
        logger.error(`[AdminController] Erro ao chamar adminService.updateUserRole: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * Controller para apagar um utilizador (apenas Admin).
 */
exports.deleteUser = async (req, res, next) => {
    // [MELHORIA] Remove verificação redundante.
    const adminUserId = req.user.id;
    const empresaId = req.user.empresaId;
    const { id: userIdToDelete } = req.params;

    logger.info(`[AdminController] Admin ${adminUserId} requisitou deleteUser para utilizador ${userIdToDelete} na empresa ${empresaId}.`);

    // [MELHORIA] Validação do ID agora é feita na rota (Passo 05)

    try {
        await adminService.deleteUser(userIdToDelete, adminUserId, empresaId);
        logger.info(`[AdminController] deleteUser para utilizador ${userIdToDelete} concluído com sucesso.`);
        res.status(204).send();
    } catch (err) {
        logger.error(`[AdminController] Erro ao chamar adminService.deleteUser: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};