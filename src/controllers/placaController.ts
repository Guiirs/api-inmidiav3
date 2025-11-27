// @ts-nocheck
// src/controllers/placaController.ts
import { Response, NextFunction } from 'express';
import { IAuthRequest } from '../types/express';
import placaService from '../services/placaService';
import logger from '../config/logger';
import cacheService from '../services/cacheService';

/**
 * Controller para criar uma nova placa.
 * POST /api/v1/placas
 */
export async function createPlacaController(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const userId = (req.user as any).id;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou createPlaca para empresa ${empresaId}.`);
    logger.debug(`[PlacaController] Dados recebidos (body): ${JSON.stringify(req.body)}`);
    logger.debug(`[PlacaController] Ficheiro recebido: ${req.file ? (req.file as any).key : 'Nenhum'}`);

    try {
        const novaPlaca = await placaService.createPlaca(req.body, req.file, empresaId);

        await cacheService.del(`placas:locations:empresa:${empresaId}`);

        logger.info(`[PlacaController] Placa ${novaPlaca.numero_placa} (ID: ${novaPlaca.id}) criada com sucesso por ${userId}.`);
        res.status(201).json(novaPlaca);
    } catch (error: any) {
        logger.error(`[PlacaController] Erro ao chamar placaService.createPlaca: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
}

/**
 * Controller para atualizar uma placa existente.
 * PUT /api/v1/placas/:id
 */
export async function updatePlacaController(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const userId = (req.user as any).id;
    const { id: placaIdToUpdate } = req.params;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou updatePlaca para ID: ${placaIdToUpdate} na empresa ${empresaId}.`);
    logger.debug(`[PlacaController] Dados recebidos (body): ${JSON.stringify(req.body)}`);
    logger.debug(`[PlacaController] Ficheiro recebido: ${req.file ? (req.file as any).key : 'Nenhum/Manter/Remover'}`);

    try {
        const placaAtualizada = await placaService.updatePlaca(placaIdToUpdate, req.body, req.file, empresaId);

        await cacheService.del(`placas:locations:empresa:${empresaId}`);

        logger.info(`[PlacaController] Placa ID ${placaIdToUpdate} atualizada com sucesso por ${userId}.`);
        res.status(200).json(placaAtualizada);
    } catch (error: any) {
        logger.error(`[PlacaController] Erro ao chamar placaService.updatePlaca (ID: ${placaIdToUpdate}): ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
}

/**
 * Controller para buscar todas as placas (com filtros, paginação).
 * GET /api/v1/placas
 */
export async function getAllPlacasController(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const userId = (req.user as any).id;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou getAllPlacas para empresa ${empresaId}.`);
    logger.debug(`[PlacaController] Query Params: ${JSON.stringify(req.query)}`);

    try {
        const result = await placaService.getAllPlacas(empresaId, req.query);
        logger.info(`[PlacaController] getAllPlacas retornou ${result.data.length} placas na página ${result.pagination.currentPage} (Total: ${result.pagination.totalDocs}).`);
        res.status(200).json(result);
    } catch (error: any) {
        logger.error(`[PlacaController] Erro ao chamar placaService.getAllPlacas: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
}

/**
 * Controller para buscar uma placa específica pelo ID.
 * GET /api/v1/placas/:id
 */
export async function getPlacaByIdController(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const userId = (req.user as any).id;
    const { id: placaIdToGet } = req.params;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou getPlacaById para ID: ${placaIdToGet} na empresa ${empresaId}.`);

    try {
        const placa = await placaService.getPlacaById(placaIdToGet, empresaId);

        logger.info(`[PlacaController] Placa ID ${placaIdToGet} encontrada com sucesso.`);
        res.status(200).json(placa);
    } catch (error: any) {
        logger.error(`[PlacaController] Erro ao chamar placaService.getPlacaById (ID: ${placaIdToGet}): ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
}

/**
 * Controller para apagar uma placa.
 * DELETE /api/v1/placas/:id
 */
export async function deletePlacaController(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const userId = (req.user as any).id;
    const { id: placaIdToDelete } = req.params;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou deletePlaca para ID: ${placaIdToDelete} na empresa ${empresaId}.`);

    try {
        await placaService.deletePlaca(placaIdToDelete, empresaId);

        await cacheService.del(`placas:locations:empresa:${empresaId}`);

        logger.info(`[PlacaController] Placa ID ${placaIdToDelete} apagada com sucesso por ${userId}.`);
        res.status(204).send();
    } catch (error: any) {
        logger.error(`[PlacaController] Erro ao chamar placaService.deletePlaca (ID: ${placaIdToDelete}): ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
}

/**
 * Controller para alternar a disponibilidade (manutenção).
 * PATCH /api/v1/placas/:id/disponibilidade
 */
export async function toggleDisponibilidadeController(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const userId = (req.user as any).id;
    const { id: placaIdToToggle } = req.params;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou toggleDisponibilidade para placa ID: ${placaIdToToggle} na empresa ${empresaId}.`);

    try {
        const placaAtualizada = await placaService.toggleDisponibilidade(placaIdToToggle, empresaId);
        
        await cacheService.del(`placas:locations:empresa:${empresaId}`);
        
        logger.info(`[PlacaController] Disponibilidade da placa ID ${placaIdToToggle} alternada com sucesso para ${placaAtualizada.disponivel} por ${userId}.`);
        res.status(200).json(placaAtualizada);
    } catch (error: any) {
        logger.error(`[PlacaController] Erro ao chamar placaService.toggleDisponibilidade (ID: ${placaIdToToggle}): ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
}

/**
 * Controller para buscar todas as localizações de placas.
 * GET /api/v1/placas/locations
 */
export async function getPlacaLocationsController(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const userId = (req.user as any).id;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou getPlacaLocations para empresa ${empresaId}.`);

    try {
        const cacheKey = `placas:locations:empresa:${empresaId}`;
        const cachedLocations = await cacheService.get(cacheKey);
        
        if (cachedLocations) {
            logger.info(`[PlacaController] Cache HIT para getPlacaLocations empresa ${empresaId}.`);
            res.status(200).json(cachedLocations);
            return;
        }

        logger.info(`[PlacaController] Cache MISS para getPlacaLocations empresa ${empresaId}. Consultando banco...`);
        const locations = await placaService.getAllPlacaLocations(empresaId);
        
        await cacheService.set(cacheKey, locations, 300);
        
        logger.info(`[PlacaController] getPlacaLocations retornou ${locations.length} localizações.`);
        res.status(200).json(locations);
    } catch (error: any) {
        logger.error(`[PlacaController] Erro ao chamar placaService.getAllPlacaLocations: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
}

/**
 * Controller para buscar placas disponíveis por período.
 * GET /api/v1/placas/disponiveis
 */
export async function getPlacasDisponiveisController(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresaId = (req.user as any).empresaId;
    const userId = (req.user as any).id;
    const dataInicio = req.query.dataInicio || req.query.data_inicio;
    const dataFim = req.query.dataFim || req.query.data_fim;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou getPlacasDisponiveis para empresa ${empresaId}.`);
    logger.debug(`[PlacaController] Query Params: ${JSON.stringify(req.query)}`);

    if (!dataInicio || !dataFim) {
        logger.warn(`[PlacaController] Requisição para getPlacasDisponiveis sem dataInicio ou dataFim.`);
        res.status(400).json({ message: 'dataInicio e dataFim são obrigatórios.' });
        return;
    }

    try {
        const placas = await placaService.getPlacasDisponiveis(empresaId, dataInicio as string, dataFim as string, req.query);
        
        logger.info(`[PlacaController] getPlacasDisponiveis retornou ${placas.length} placas.`);
        res.status(200).json({ data: placas });
    } catch (error: any) {
        logger.error(`[PlacaController] Erro ao chamar placaService.getPlacasDisponiveis: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
}

export default {
    createPlacaController,
    updatePlacaController,
    getAllPlacasController,
    getPlacaByIdController,
    deletePlacaController,
    toggleDisponibilidadeController,
    getPlacaLocationsController,
    getPlacasDisponiveisController
};

