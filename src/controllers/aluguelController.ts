// @ts-nocheck
// src/controllers/aluguelController.ts
import { Response, NextFunction } from 'express';
import { IAuthRequest } from '../types/express';
import AluguelService from '../services/aluguelService';
import logger from '../config/logger';

// Instancia o serviço
const aluguelService = new AluguelService();

/**
 * Controller para obter o histórico de alugueis de uma placa específica.
 * GET /api/v1/alugueis/placa/:placaId
 */
export async function getAlugueisByPlaca(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresa_id = (req.user as any).empresaId;
    const { placaId } = req.params;

    logger.info(`[AluguelController] Requisitado getAlugueisByPlaca para placa ${placaId} na empresa ${empresa_id}.`);

    try {
        const alugueis = await aluguelService.getAlugueisByPlaca(placaId, empresa_id);
        logger.info(`[AluguelController] getAlugueisByPlaca retornou ${alugueis.length} alugueis para placa ${placaId}.`);
        res.status(200).json(alugueis);
    } catch (err: any) {
        logger.error(`[AluguelController] Erro ao chamar aluguelService.getAlugueisByPlaca: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
}

/**
 * Controller para criar um novo aluguel.
 * POST /api/v1/alugueis/
 */
export async function createAluguel(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresa_id = (req.user as any).empresaId;

    logger.info(`[AluguelController] Requisitado createAluguel para empresa ${empresa_id}.`);
    logger.debug(`[AluguelController] Dados recebidos para createAluguel: ${JSON.stringify(req.body)}`);

    try {
        const novoAluguel = await aluguelService.createAluguel(req.body, empresa_id);
        logger.info(`[AluguelController] createAluguel bem-sucedido. Novo aluguel ID: ${novoAluguel.id}`);
        res.status(201).json(novoAluguel);
    } catch (err: any) {
        logger.error(`[AluguelController] Erro ao chamar aluguelService.createAluguel: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
}

/**
 * Controller para apagar (cancelar) um aluguel.
 * DELETE /api/v1/alugueis/:id
 */
export async function deleteAluguel(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresa_id = (req.user as any).empresaId;
    const { id: aluguelId } = req.params;

    logger.info(`[AluguelController] Requisitado deleteAluguel para ID ${aluguelId} na empresa ${empresa_id}.`);

    try {
        const result = await aluguelService.deleteAluguel(aluguelId, empresa_id);
        logger.info(`[AluguelController] deleteAluguel para ID ${aluguelId} concluído com sucesso.`);
        res.status(200).json(result);
    } catch (err: any) {
        logger.error(`[AluguelController] Erro ao chamar aluguelService.deleteAluguel: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
}

/**
 * Controller para buscar aluguéis por bi-semana
 * GET /api/v1/alugueis/bi-week/:biWeekId
 */
export async function getAlugueisByBiWeek(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresa_id = (req.user as any).empresaId;
    const { biWeekId } = req.params;

    logger.info(`[AluguelController] Requisitado getAlugueisByBiWeek para bi-semana ${biWeekId} na empresa ${empresa_id}.`);

    try {
        const alugueis = await aluguelService.getAlugueisByBiWeek(biWeekId, empresa_id);
        logger.info(`[AluguelController] ${alugueis.length} aluguéis encontrados para bi-semana ${biWeekId}.`);
        res.status(200).json(alugueis);
    } catch (err: any) {
        logger.error(`[AluguelController] Erro ao buscar aluguéis por bi-semana: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
}

/**
 * Controller para buscar placas disponíveis em uma bi-semana
 * GET /api/v1/alugueis/bi-week/:biWeekId/disponiveis
 */
export async function getPlacasDisponiveisByBiWeek(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresa_id = (req.user as any).empresaId;
    const { biWeekId } = req.params;

    logger.info(`[AluguelController] Requisitado getPlacasDisponiveisByBiWeek para bi-semana ${biWeekId} na empresa ${empresa_id}.`);

    try {
        const placas = await aluguelService.getPlacasDisponiveisByBiWeek(biWeekId, empresa_id);
        logger.info(`[AluguelController] ${placas.length} placas disponíveis na bi-semana ${biWeekId}.`);
        res.status(200).json(placas);
    } catch (err: any) {
        logger.error(`[AluguelController] Erro ao buscar placas disponíveis: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
}

/**
 * Controller para gerar relatório de ocupação por bi-semana
 * GET /api/v1/alugueis/bi-week/:biWeekId/relatorio
 */
export async function getRelatorioOcupacaoBiWeek(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    const empresa_id = (req.user as any).empresaId;
    const { biWeekId } = req.params;

    logger.info(`[AluguelController] Requisitado getRelatorioOcupacaoBiWeek para bi-semana ${biWeekId} na empresa ${empresa_id}.`);

    try {
        const relatorio = await aluguelService.getRelatorioOcupacaoBiWeek(biWeekId, empresa_id);
        logger.info(`[AluguelController] Relatório gerado para bi-semana ${biWeekId}.`);
        res.status(200).json(relatorio);
    } catch (err: any) {
        logger.error(`[AluguelController] Erro ao gerar relatório: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
}

export default {
    getAlugueisByPlaca,
    createAluguel,
    deleteAluguel,
    getAlugueisByBiWeek,
    getPlacasDisponiveisByBiWeek,
    getRelatorioOcupacaoBiWeek
};

