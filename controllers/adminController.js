// controllers/adminController.js
const AdminService = require('../services/adminService'); // Importa o serviço Mongoose
const logger = require('../config/logger'); // Importa o logger
const { validationResult } = require('express-validator'); // Necessário se houver validação aqui (não há neste caso)

// Instancia o serviço fora das funções do controller para reutilização
const adminService = new AdminService();

/**
 * Controller para criar um novo utilizador (apenas Admin).
 */
exports.createUser = async (req, res, next) => {
    // Verifica se req.user existe (do authMiddleware) e tem empresa_id
    // O adminAuthMiddleware já deve ter garantido que req.user.role é 'admin'
    
    // <<< 🐞 CORREÇÃO: Usar empresaId (camelCase) do token >>>
    if (!req.user || !req.user.empresaId) { 
        logger.error('[AdminController] createUser: Informações do utilizador (empresaId) em falta no token.');
        // Retorna 401 ou 403 - 401 faz mais sentido se a info estiver em falta
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresa_id = req.user.empresaId; // <<< 🐞 CORREÇÃO: Usar empresaId (camelCase) do token >>>
    const adminUserId = req.user.id; // ID do admin que está a criar

    logger.info(`[AdminController] Admin ${adminUserId} requisitou createUser para empresa ${empresa_id}.`);
    // Cuidado ao logar req.body se contiver senhas
    logger.debug(`[AdminController] Dados recebidos para createUser (parcial): { username: ${req.body.username}, email: ${req.body.email}, role: ${req.body.role} }`); 

    try {
        // Chama o serviço refatorado (que já tem validações internas e tratamento de erros)
        const createdUser = await adminService.createUser(req.body, empresa_id);

        logger.info(`[AdminController] Utilizador ${createdUser.username} (ID: ${createdUser.id}) criado com sucesso por admin ${adminUserId}.`);
        // O serviço já retorna um objeto seguro { id, username, email, role }
        res.status(201).json(createdUser);
    } catch (err) {
        // Loga o erro recebido do serviço antes de passar para o errorHandler
        logger.error(`[AdminController] Erro ao chamar adminService.createUser: ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (400, 409, 500) vindo do serviço
        next(err);
    }
};

/**
 * Controller para obter todos os utilizadores da empresa (apenas Admin).
 */
exports.getAllUsers = async (req, res, next) => {
    // <<< 🐞 CORREÇÃO: Usar empresaId (camelCase) do token >>>
    if (!req.user || !req.user.empresaId) { 
        logger.error('[AdminController] getAllUsers: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresa_id = req.user.empresaId; // <<< 🐞 CORREÇÃO: Usar empresaId (camelCase) do token >>>
    const adminUserId = req.user.id;

    logger.info(`[AdminController] Admin ${adminUserId} requisitou getAllUsers para empresa ${empresa_id}.`);

    try {
        // Chama o serviço
        const users = await adminService.getAllUsers(empresa_id);
        logger.info(`[AdminController] getAllUsers retornou ${users.length} utilizadores para empresa ${empresa_id}.`);
        // O serviço já retorna a lista formatada (sem senhas)
        res.status(200).json(users);
    } catch (err) {
        // Loga o erro recebido do serviço
        logger.error(`[AdminController] Erro ao chamar adminService.getAllUsers: ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (provavelmente 500) vindo do serviço
        next(err);
    }
};

/**
 * Controller para atualizar a role de um utilizador (apenas Admin).
 */
exports.updateUserRole = async (req, res, next) => {
    // <<< 🐞 CORREÇÃO: Usar empresaId (camelCase) do token >>>
    if (!req.user || !req.user.empresaId) { 
        logger.error('[AdminController] updateUserRole: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresa_id = req.user.empresaId; // <<< 🐞 CORREÇÃO: Usar empresaId (camelCase) do token >>>
    const adminUserId = req.user.id;
    const { id: userIdToUpdate } = req.params; // ID do utilizador a ser atualizado
    const { role: newRole } = req.body; // Nova role

    logger.info(`[AdminController] Admin ${adminUserId} requisitou updateUserRole para utilizador ${userIdToUpdate} na empresa ${empresa_id}. Nova role: ${newRole}`);

    try {
        // Chama o serviço (que tem validações internas)
        const result = await adminService.updateUserRole(userIdToUpdate, newRole, empresa_id);
        logger.info(`[AdminController] updateUserRole para utilizador ${userIdToUpdate} concluído com sucesso.`);
        res.status(200).json(result); // Serviço retorna { message: '...' }
    } catch (err) {
        // Loga o erro recebido do serviço
        logger.error(`[AdminController] Erro ao chamar adminService.updateUserRole: ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (400, 404, 500) vindo do serviço
        next(err);
    }
};

/**
 * Controller para apagar um utilizador (apenas Admin).
 */
exports.deleteUser = async (req, res, next) => {
    // <<< 🐞 CORREÇÃO: Usar empresaId (camelCase) e id do token >>>
    if (!req.user || !req.user.id || !req.user.empresaId) { 
        logger.error('[AdminController] deleteUser: Informações do utilizador (id/empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const adminUserId = req.user.id; // ID do admin fazendo a requisição
    const empresa_id = req.user.empresaId; // Empresa do admin
    const { id: userIdToDelete } = req.params; // ID do utilizador a ser apagado

    logger.info(`[AdminController] Admin ${adminUserId} requisitou deleteUser para utilizador ${userIdToDelete} na empresa ${empresa_id}.`);

    try {
        // Chama o serviço (que tem a lógica de não se auto-apagar)
        await adminService.deleteUser(userIdToDelete, adminUserId, empresa_id);
        logger.info(`[AdminController] deleteUser para utilizador ${userIdToDelete} concluído com sucesso.`);
        res.status(204).send(); // No Content
    } catch (err) {
        // Loga o erro recebido do serviço
        logger.error(`[AdminController] Erro ao chamar adminService.deleteUser: ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (400, 404, 500) vindo do serviço
        next(err);
    }
};


// Removido createAdminController pois agora exportamos as funções diretamente
// module.exports = createAdminController();