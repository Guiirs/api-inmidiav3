// @ts-nocheck
// src/controllers/empresaController.ts
import { Response, NextFunction } from 'express';
import { IAuthRequest } from '../types/express';
import logger from '../config/logger';
import * as empresaService from '../services/empresaService';
import AppError from '../utils/AppError';
import cacheService from '../services/cacheService';

/**
 * Get API Key
 */
export async function getApiKey(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const empresaId = (req.user as any).empresaId;
        const apiKey = await empresaService.getApiKey(empresaId);
        
        if (!apiKey) {
            res.status(404).json({ message: 'API Key não encontrada.' });
            return;
        }
        
        res.status(200).json({ apiKey });
    } catch (error: any) {
        logger.error(`[EmpresaController] Erro ao buscar API Key: ${error.message}`);
        next(error);
    }
}

/**
 * Regenerate API Key
 */
export async function regenerateApiKey(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const empresaId = (req.user as any).empresaId;
        
        const newApiKey = await empresaService.regenerateApiKey(empresaId);
        
        res.status(200).json({ 
            message: 'API Key regenerada com sucesso.',
            apiKey: newApiKey 
        });
    } catch (error: any) {
        logger.error(`[EmpresaController] Erro ao regenerar API Key: ${error.message}`);
        next(error);
    }
}

/**
 * Get Empresa Details
 */
export async function getEmpresaDetails(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const empresaId = (req.user as any).empresaId;
        
        const cacheKey = `empresa:details:${empresaId}`;
        const cachedEmpresa = await cacheService.get(cacheKey);
        
        if (cachedEmpresa) {
            logger.info(`[EmpresaController] Cache HIT para getEmpresaDetails empresa ${empresaId}.`);
            res.status(200).json({
                status: 'success',
                data: cachedEmpresa
            });
            return;
        }

        logger.info(`[EmpresaController] Cache MISS para getEmpresaDetails empresa ${empresaId}. Consultando banco...`);
        const empresa = await empresaService.getEmpresaDetails(empresaId);
        
        await cacheService.set(cacheKey, empresa, 600);
        
        res.status(200).json({
            status: 'success',
            data: empresa
        });
    } catch (error: any) {
        next(error);
    }
}

/**
 * Update Empresa Details
 */
export async function updateEmpresaDetails(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const empresaId = (req.user as any).empresaId;
        const updateData = req.body;

        const empresaAtualizada = await empresaService.updateEmpresaDetails(empresaId, updateData);
        
        await cacheService.del(`empresa:details:${empresaId}`);
        
        res.status(200).json({
            status: 'success',
            message: 'Detalhes da empresa atualizados com sucesso.',
            data: empresaAtualizada
        });
    } catch (error: any) {
        next(error);
    }
}

/**
 * Controller para registar uma nova Empresa e o seu Admin.
 * Esta rota é pública e não usa req.user.
 */
export async function registerEmpresaController(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { nome_empresa, cnpj, username, email, password, nome, sobrenome } = req.body;

        const empresaData = {
            nome: nome_empresa,
            cnpj: cnpj,
        };
        
        const userData = {
            username,
            email,
            password,
            nome,
            sobrenome,
        };

        const { empresa, user } = await empresaService.registerEmpresa(empresaData, userData);

        res.status(201).json({
            status: 'success',
            message: 'Empresa e utilizador administrador criados com sucesso. Por favor, faça login.',
            data: {
                empresaId: empresa._id,
                userId: user._id,
            }
        });

    } catch (error: any) {
        next(error);
    }
}

// Não exportar default, apenas named exports
// export default {
//     getApiKey,
//     regenerateApiKey,
//     getEmpresaDetails,
//     updateEmpresaDetails,
//     registerEmpresaController
// };


