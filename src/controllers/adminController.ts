// @ts-nocheck
// src/controllers/adminController.ts
import { Response, NextFunction } from 'express';
import { IAuthRequest } from '../types/express';
import AdminService from '../services/adminService';
import logger from '../config/logger';

// Instancia o serviço fora das funções do controller para reutilização
const adminService = new AdminService();

/**
 * Controller para criar um novo utilizador (apenas Admin).
 */
export async function createUser(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const adminUserId = (req.user as any).id;

    logger.info(`[AdminController] Admin ${adminUserId} requisitou createUser para empresa ${empresaId}.`);
    logger.debug(`[AdminController] Dados recebidos para createUser (parcial): { username: ${req.body.username}, email: ${req.body.email}, role: ${req.body.role} }`);

    try {
        const createdUser = await adminService.createUser(req.body, empresaId);

        logger.info(`[AdminController] Utilizador ${createdUser.username} (ID: ${createdUser.id}) criado com sucesso por admin ${adminUserId}.`);
        res.status(201).json(createdUser);
    } catch (err: any) {
        logger.error(`[AdminController] Erro ao chamar adminService.createUser: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
}

/**
 * Controller para obter todos os utilizadores da empresa (apenas Admin).
 */
export async function getAllUsers(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const adminUserId = (req.user as any).id;

    logger.info(`[AdminController] Admin ${adminUserId} requisitou getAllUsers para empresa ${empresaId}.`);

    try {
        const users = await adminService.getAllUsers(empresaId);
        logger.info(`[AdminController] getAllUsers retornou ${users.length} utilizadores para empresa ${empresaId}.`);
        res.status(200).json(users);
    } catch (err: any) {
        logger.error(`[AdminController] Erro ao chamar adminService.getAllUsers: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
}

/**
 * Controller para atualizar a role de um utilizador (apenas Admin).
 */
export async function updateUserRole(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const adminUserId = (req.user as any).id;
    const { id: userIdToUpdate } = req.params;
    const { role: newRole } = req.body;

    logger.info(`[AdminController] Admin ${adminUserId} requisitou updateUserRole para utilizador ${userIdToUpdate} na empresa ${empresaId}. Nova role: ${newRole}`);

    try {
        const result = await adminService.updateUserRole(userIdToUpdate, newRole, empresaId);
        logger.info(`[AdminController] updateUserRole para utilizador ${userIdToUpdate} concluído com sucesso.`);
        res.status(200).json(result);
    } catch (err: any) {
        logger.error(`[AdminController] Erro ao chamar adminService.updateUserRole: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
}

/**
 * Controller para apagar um utilizador (apenas Admin).
 */
export async function deleteUser(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const adminUserId = (req.user as any).id;
    const empresaId = (req.user as any).empresaId;
    const { id: userIdToDelete } = req.params;

    logger.info(`[AdminController] Admin ${adminUserId} requisitou deleteUser para utilizador ${userIdToDelete} na empresa ${empresaId}.`);

    try {
        await adminService.deleteUser(userIdToDelete, adminUserId, empresaId);
        logger.info(`[AdminController] deleteUser para utilizador ${userIdToDelete} concluído com sucesso.`);
        res.status(204).send();
    } catch (err: any) {
        logger.error(`[AdminController] Erro ao chamar adminService.deleteUser: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
}

export default {
    createUser,
    getAllUsers,
    updateUserRole,
    deleteUser
};

