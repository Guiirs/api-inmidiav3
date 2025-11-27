// @ts-nocheck
// src/controllers/publicApiController.ts
import { Response, NextFunction } from 'express';
import { IApiKeyRequest } from '../types/express';
import PublicApiService from '../services/publicApiService';
import logger from '../config/logger';

// Instancia o serviço fora das funções do controller
const publicApiService = new PublicApiService();

/**
 * Controller para obter as placas disponíveis para a empresa autenticada via API Key.
 * GET /api/v1/public/placas/disponiveis
 */
export async function getAvailablePlacas(req: IApiKeyRequest, res: Response, next: NextFunction): Promise<void> {
    logger.info(`[PublicApiController] Recebida requisição GET /public/placas/disponiveis.`);

    const empresa_id = req.empresa!._id;
    const empresaNome = req.empresa!.nome;

    logger.info(`[PublicApiController] Chave API validada para empresa: ${empresaNome} (ID: ${empresa_id}). Buscando placas disponíveis.`);

    try {
        const placas = await publicApiService.getAvailablePlacas(empresa_id);

        logger.info(`[PublicApiController] getAvailablePlacas retornou ${placas.length} placas disponíveis para empresa ${empresa_id}.`);
        res.status(200).json(placas);
    } catch (err: any) {
        logger.error(`[PublicApiController] Erro ao chamar publicApiService.getAvailablePlacas para empresa ${empresa_id}: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
}

export default {
    getAvailablePlacas
};

