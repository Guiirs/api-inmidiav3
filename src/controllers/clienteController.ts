// @ts-nocheck
// src/controllers/clienteController.ts
import { Response, NextFunction } from 'express';
import { IAuthRequest } from '../types/express';
import {
    createCliente,
    updateCliente,
    getAllClientes,
    getClienteById,
    deleteCliente
} from '../services/clienteService';
import logger from '../config/logger';
import cacheService from '../services/cacheService';

/**
 * Controller para criar um novo cliente.
 * POST /api/v1/clientes
 */
export async function createClienteController(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const adminUserId = (req.user as any).id;

    logger.info(`[ClienteController] Utilizador ${adminUserId} requisitou createCliente para empresa ${empresaId}.`);
    logger.debug(`[ClienteController] Ficheiro recebido (logo): ${req.file ? (req.file as any).key : 'Nenhum'}`);

    try {
        const novoCliente = await createCliente(req.body, req.file, empresaId);

        // Invalidar cache de clientes após criação
        await cacheService.invalidatePattern(`clientes:empresa:${empresaId}:*`);

        logger.info(`[ClienteController] Cliente ${novoCliente.nome} (ID: ${novoCliente.id}) criado com sucesso por ${adminUserId}.`);
        res.status(201).json(novoCliente);
    } catch (error: any) {
        logger.error(`[ClienteController] Erro ao chamar clienteService.createCliente: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
}

/**
 * Controller para atualizar um cliente existente.
 * PUT /api/v1/clientes/:id
 */
export async function updateClienteController(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const adminUserId = (req.user as any).id;
    const { id: clienteIdToUpdate } = req.params;

    logger.info(`[ClienteController] Utilizador ${adminUserId} requisitou updateCliente para ID: ${clienteIdToUpdate} na empresa ${empresaId}.`);
    logger.debug(`[ClienteController] Ficheiro recebido (logo): ${req.file ? (req.file as any).key : 'Nenhum/Manter/Remover'}`);

    try {
        const clienteAtualizado = await updateCliente(clienteIdToUpdate, req.body, req.file, empresaId);

        // Invalidar cache de clientes após atualização
        await cacheService.invalidatePattern(`clientes:empresa:${empresaId}:*`);

        logger.info(`[ClienteController] Cliente ID ${clienteIdToUpdate} atualizado com sucesso por ${adminUserId}.`);
        res.status(200).json(clienteAtualizado);
    } catch (error: any) {
        logger.error(`[ClienteController] Erro ao chamar clienteService.updateCliente (ID: ${clienteIdToUpdate}): ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
}

/**
 * Controller para buscar todos os clientes da empresa.
 * GET /api/v1/clientes
 */
export async function getAllClientesController(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const userId = (req.user as any).id;

    logger.info(`[ClienteController] Utilizador ${userId} requisitou getAllClientes para empresa ${empresaId}.`);

    try {
        const page = req.query.page || 1;
        const limit = req.query.limit || 10;
        const cacheKey = `clientes:empresa:${empresaId}:page:${page}:limit:${limit}`;
        
        const cachedClientes = await cacheService.get(cacheKey);
        
        if (cachedClientes) {
            logger.info(`[ClienteController] Cache HIT para getAllClientes empresa ${empresaId} (page ${page}).`);
            res.status(200).json(cachedClientes);
            return;
        }

        logger.info(`[ClienteController] Cache MISS para getAllClientes empresa ${empresaId} (page ${page}). Consultando banco...`);
        const clientesResult = await getAllClientes(empresaId, req.query);

        await cacheService.set(cacheKey, clientesResult, 180);

        logger.info(`[ClienteController] getAllClientes retornou ${clientesResult.data.length} clientes para empresa ${empresaId}.`);
        res.status(200).json(clientesResult);
        
    } catch (error: any) {
        logger.error(`[ClienteController] Erro ao chamar clienteService.getAllClientes: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
}

/**
 * Controller para buscar um cliente específico pelo ID.
 * GET /api/v1/clientes/:id
 */
export async function getClienteByIdController(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const userId = (req.user as any).id;
    const { id: clienteIdToGet } = req.params;

    logger.info(`[ClienteController] Utilizador ${userId} requisitou getClienteById para ID: ${clienteIdToGet} na empresa ${empresaId}.`);

    try {
        const cliente = await getClienteById(clienteIdToGet, empresaId);

        logger.info(`[ClienteController] Cliente ID ${clienteIdToGet} encontrado com sucesso.`);
        res.status(200).json(cliente);
    } catch (error: any) {
        logger.error(`[ClienteController] Erro ao chamar clienteService.getClienteById (ID: ${clienteIdToGet}): ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
}

/**
 * Controller para apagar um cliente.
 * DELETE /api/v1/clientes/:id
 */
export async function deleteClienteController(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const adminUserId = (req.user as any).id;
    const { id: clienteIdToDelete } = req.params;

    logger.info(`[ClienteController] Utilizador ${adminUserId} requisitou deleteCliente para ID: ${clienteIdToDelete} na empresa ${empresaId}.`);

    try {
        await deleteCliente(clienteIdToDelete, empresaId);

        // Invalidar cache de clientes após exclusão
        await cacheService.invalidatePattern(`clientes:empresa:${empresaId}:*`);

        logger.info(`[ClienteController] Cliente ID ${clienteIdToDelete} apagado com sucesso por ${adminUserId}.`);
        res.status(204).send();
    } catch (error: any) {
        logger.error(`[ClienteController] Erro ao chamar clienteService.deleteCliente (ID: ${clienteIdToDelete}): ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
}

export default {
    createClienteController,
    updateClienteController,
    getAllClientesController,
    getClienteByIdController,
    deleteClienteController
};

