// @ts-nocheck
// src/services/publicApiService.ts
import Placa from '../models/Placa';
import Regiao from '../models/Regiao';
import mongoose from 'mongoose';
import logger from '../config/logger';
import AppError from '../utils/AppError';

class PublicApiService {
    constructor() {}

    async getAvailablePlacas(empresa_id: string | mongoose.Types.ObjectId): Promise<any[]> {
        logger.info(`[PublicApiService] Buscando placas disponíveis para empresa ID: ${empresa_id}.`);

        if (!empresa_id || !mongoose.Types.ObjectId.isValid(String(empresa_id))) {
            throw new AppError('ID da empresa inválido fornecido.', 400);
        }

        const empresaObjectId = new mongoose.Types.ObjectId(String(empresa_id));

        try {
            logger.debug(`[PublicApiService] Executando query find() para placas disponíveis da empresa ${empresaObjectId}.`);
            
            const placasDisponiveis = await Placa.find({
                    empresa: empresaObjectId,
                    disponivel: true
                })
                .populate('regiao', 'nome')
                .select('numero_placa coordenadas nomeDaRua tamanho imagem regiao -_id -__v')
                .lean()
                .exec();
                
            logger.info(`[PublicApiService] Encontradas ${placasDisponiveis.length} placas disponíveis para empresa ${empresa_id}.`);

            const resultadoFormatado = placasDisponiveis.map((placa: any) => ({
                numero_placa: placa.numero_placa || null,
                coordenadas: placa.coordenadas || null,
                nomeDaRua: placa.nomeDaRua || null,
                tamanho: placa.tamanho || null,
                imagem: placa.imagem || null,
                regiao: placa.regiao ? placa.regiao.nome : null
            }));

            return resultadoFormatado;

        } catch (error: any) {
            logger.error(`[PublicApiService] Erro Mongoose/DB ao buscar placas disponíveis para empresa ${empresa_id}: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro interno ao buscar placas disponíveis: ${error.message}`, 500);
        }
    }
}

export default PublicApiService;

