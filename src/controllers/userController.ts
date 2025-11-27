// @ts-nocheck
// src/controllers/userController.ts
import { Response, NextFunction } from 'express';
import { IAuthRequest } from '../types/express';
import UserService from '../services/userService';
import logger from '../config/logger';

// Instancia o serviço fora das funções do controller
const userService = new UserService();

/**
 * Controller para obter o perfil do utilizador autenticado.
 * GET /api/v1/user/me
 */
export async function getUserProfile(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = (req.user as any).id;
    
    logger.info(`[UserController] Utilizador ID ${userId} requisitou getUserProfile.`);

    try {
        const user = await userService.getProfile(userId);
        logger.info(`[UserController] Perfil do utilizador ID ${userId} encontrado com sucesso.`);
        res.status(200).json(user);
    } catch (err: any) {
        logger.error(`[UserController] Erro ao chamar userService.getProfile (ID: ${userId}): ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
}

/**
 * Controller para atualizar o perfil do utilizador autenticado.
 * PUT /api/v1/user/me
 */
export async function updateUserProfile(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = (req.user as any).id;

    logger.info(`[UserController] Utilizador ID ${userId} requisitou updateUserProfile.`);
    logger.debug(`[UserController] Dados recebidos para update: ${JSON.stringify(req.body)}`);

    try {
        const updatedUser = await userService.updateProfile(userId, req.body);
        
        logger.info(`[UserController] Perfil do utilizador ID ${userId} atualizado com sucesso.`);
        res.status(200).json({
            message: 'Dados do utilizador atualizados com sucesso.',
            user: updatedUser 
        });
    } catch (err: any) {
        logger.error(`[UserController] Erro ao chamar userService.updateProfile (ID: ${userId}): ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
}

/**
 * Controller para obter os dados da empresa associada (apenas Admin).
 * GET /api/v1/user/me/empresa
 */
export async function getEmpresaProfile(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresa_id = (req.user as any).empresaId;
    const userRole = (req.user as any).role;
    const userId = (req.user as any).id;

    logger.info(`[UserController] Utilizador ID ${userId} requisitou getEmpresaProfile (Role: ${userRole}).`);

    try {
        const empresa = await userService.getEmpresaProfile(empresa_id, userRole);
        
        logger.info(`[UserController] Perfil da empresa ID ${empresa_id} encontrado com sucesso.`);
        res.status(200).json(empresa);
    } catch (err: any) {
        logger.error(`[UserController] Erro ao chamar userService.getEmpresaProfile (Empresa: ${empresa_id}): ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
}

/**
 * Controller para regenerar a API Key da empresa (apenas Admin com confirmação de senha).
 * POST /api/v1/user/me/empresa/regenerate-api-key
 */
export async function regenerateEmpresaApiKey(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = (req.user as any).id;
    const empresaId = (req.user as any).empresaId;
    const userRole = (req.user as any).role;
    const { password } = req.body;

    logger.info(`[UserController] Utilizador ID ${userId} requisitou regenerateEmpresaApiKey (Role: ${userRole}).`);

    try {
        const auditData = {
            ip_address: req.ip || req.connection?.remoteAddress,
            user_agent: req.get('user-agent')
        };

        const result = await userService.regenerateApiKey(userId, empresaId, userRole, password, auditData);

        logger.info(`[UserController] API Key regenerada com sucesso para empresa ${empresaId} por admin ${userId}.`);
        
        res.status(200).json({
            message: 'API Key regenerada com sucesso! Guarde-a num local seguro.',
            fullApiKey: result.fullApiKey,
            newApiKeyPrefix: result.newPrefix
        });
    } catch (err: any) {
        logger.error(`[UserController] Erro ao chamar userService.regenerateApiKey (Empresa: ${empresaId}): ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
}

export default {
    getUserProfile,
    updateUserProfile,
    getEmpresaProfile,
    regenerateEmpresaApiKey
};

