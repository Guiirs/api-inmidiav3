// @ts-nocheck
// services/periodService.js
/**
 * PERÍODO SERVICE - SERVIÇO CENTRALIZADO PARA GESTÃO DE PERÍODOS
 * 
 * Este serviço unifica toda a lógica de períodos (bi-weeks e custom)
 * em um único lugar, evitando duplicação de código.
 * 
 * RESPONSABILIDADES:
 * - Calcular datas de bi-weeks
 * - Validar períodos customizados
 * - Converter entre formatos antigos e novos
 * - Verificar conflitos de datas
 * - Calcular duração de períodos
 */

import BiWeek from '../models/BiWeek';
import { PeriodType, validatePeriod, normalizePeriodInput } from '../utils/periodTypes';
import logger from '../config/logger';
import AppError from '../utils/AppError';

class PeriodService {
    /**
     * Processa dados de período de entrada e retorna formato padronizado
     * Suporta ambos os formatos: antigo (bi_week_ids/data_inicio) e novo (periodType/startDate)
     * 
     * @param {Object} input - Dados de entrada
     * @returns {Promise<Object>} - { periodType, startDate, endDate, biWeekIds, biWeeks }
     */
    static async processPeriodInput(input) {
        logger.debug('[PeriodService] Processando input de período', { input });

        // Normalizar entrada (converte formato antigo para novo)
        const normalized = normalizePeriodInput(input);

        // Se for bi-week e não tem datas, calcular das bi-weeks
        if (normalized.periodType === PeriodType.BI_WEEK && normalized.biWeekIds && normalized.biWeekIds.length > 0) {
            const biWeekData = await this.calculateDatesFromBiWeeks(normalized.biWeekIds);
            normalized.startDate = biWeekData.startDate;
            normalized.endDate = biWeekData.endDate;
            normalized.biWeeks = biWeekData.biWeeks;
        }

        // Se for custom e tem datas, validar se alinha com bi-weeks (opcional - avisar usuário)
        if (normalized.periodType === PeriodType.CUSTOM && normalized.startDate && normalized.endDate) {
            const alignment = await this.checkBiWeekAlignment(normalized.startDate, normalized.endDate);
            if (!alignment.aligned) {
                logger.warn('[PeriodService] Período customizado não alinha com bi-semanas', {
                    startDate: normalized.startDate,
                    endDate: normalized.endDate,
                    suggestion: alignment.suggestion
                });
                // Não é erro - apenas log de aviso
            }
        }

        // Validar período final
        const validation = validatePeriod(normalized);
        if (!validation.valid) {
            throw new AppError(`Período inválido: ${validation.errors.join(', ')}`, 400);
        }

        logger.info('[PeriodService] Período processado com sucesso', {
            periodType: normalized.periodType,
            startDate: normalized.startDate,
            endDate: normalized.endDate,
            biWeekIds: normalized.biWeekIds
        });

        return normalized;
    }

    /**
     * Calcula startDate e endDate a partir de IDs de bi-semanas
     * 
     * @param {Array<string>} biWeekIds - Array de IDs de bi-semanas (ex: ['2025-02', '2025-04'])
     * @returns {Promise<Object>} - { startDate, endDate, biWeeks }
     */
    static async calculateDatesFromBiWeeks(biWeekIds) {
        if (!biWeekIds || biWeekIds.length === 0) {
            throw new AppError('biWeekIds é obrigatório para calcular datas de bi-semanas', 400);
        }

        logger.debug('[PeriodService] Calculando datas de bi-semanas', { biWeekIds });

        // Buscar bi-semanas no banco
        const biWeeks = await BiWeek.find({ bi_week_id: { $in: biWeekIds } })
            .sort({ start_date: 1 })
            .exec();

        if (biWeeks.length === 0) {
            throw new AppError(`Nenhuma bi-semana encontrada para os IDs: ${biWeekIds.join(', ')}`, 404);
        }

        if (biWeeks.length !== biWeekIds.length) {
            const foundIds = biWeeks.map(bw => bw.bi_week_id);
            const missingIds = biWeekIds.filter(id => !foundIds.includes(id));
            throw new AppError(`Bi-semanas não encontradas: ${missingIds.join(', ')}`, 404);
        }

        // Verificar continuidade
        this.validateBiWeekContinuity(biWeeks);

        const startDate = biWeeks[0].start_date;
        const endDate = biWeeks[biWeeks.length - 1].end_date;

        logger.info('[PeriodService] Datas calculadas de bi-semanas', {
            biWeekIds,
            startDate,
            endDate,
            biWeeksCount: biWeeks.length
        });

        return {
            startDate,
            endDate,
            biWeeks: biWeeks.map(bw => bw._id),
            biWeekIds: biWeeks.map(bw => bw.bi_week_id)
        };
    }

    /**
     * Verifica se um período de datas customizado alinha com bi-semanas
     * 
     * @param {Date} startDate - Data de início
     * @param {Date} endDate - Data de fim
     * @returns {Promise<Object>} - { aligned: boolean, suggestion?: Object, biWeeks?: Array }
     */
    static async checkBiWeekAlignment(startDate, endDate) {
        logger.debug('[PeriodService] Verificando alinhamento com bi-semanas', { startDate, endDate });

        // Normalizar datas para UTC 00:00:00
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(0, 0, 0, 0);

        // Buscar bi-semanas que intersectam o período
        const biWeeks = await BiWeek.find({
            $or: [
                { start_date: { $gte: start, $lte: end } },
                { end_date: { $gte: start, $lte: end } },
                { start_date: { $lte: start }, end_date: { $gte: end } }
            ]
        }).sort({ start_date: 1 }).exec();

        if (biWeeks.length === 0) {
            return {
                aligned: false,
                message: 'Nenhuma bi-semana encontrada para este período'
            };
        }

        const firstBiWeek = biWeeks[0];
        const lastBiWeek = biWeeks[biWeeks.length - 1];

        // Verificar se as datas coincidem exatamente
        const startAligned = start.getTime() === firstBiWeek.start_date.getTime();
        const endAligned = end.getTime() === lastBiWeek.end_date.getTime();

        if (startAligned && endAligned) {
            logger.info('[PeriodService] Período alinhado perfeitamente com bi-semanas', {
                biWeeks: biWeeks.map(bw => bw.bi_week_id)
            });
            return {
                aligned: true,
                biWeeks: biWeeks.map(bw => bw._id),
                biWeekIds: biWeeks.map(bw => bw.bi_week_id)
            };
        }

        // Se não alinha, sugerir ajuste
        logger.warn('[PeriodService] Período não alinha com bi-semanas', {
            startAligned,
            endAligned,
            suggestion: {
                start: firstBiWeek.start_date,
                end: lastBiWeek.end_date
            }
        });

        return {
            aligned: false,
            suggestion: {
                startDate: firstBiWeek.start_date,
                endDate: lastBiWeek.end_date,
                biWeeks: biWeeks.map(bw => bw._id),
                biWeekIds: biWeeks.map(bw => bw.bi_week_id),
                message: `Sugestão: ${this.formatDate(firstBiWeek.start_date)} até ${this.formatDate(lastBiWeek.end_date)}`
            }
        };
    }

    /**
     * Valida continuidade de bi-semanas (não pode ter gaps)
     * 
     * @param {Array} biWeeks - Array de documentos BiWeek ordenados por start_date
     * @throws {AppError} - Se houver gaps entre bi-semanas
     */
    static validateBiWeekContinuity(biWeeks) {
        if (biWeeks.length <= 1) return;

        for (let i = 0; i < biWeeks.length - 1; i++) {
            const current = biWeeks[i];
            const next = biWeeks[i + 1];

            const expectedNextStart = new Date(current.end_date);
            expectedNextStart.setUTCDate(expectedNextStart.getUTCDate() + 1);

            const actualNextStart = new Date(next.start_date);

            if (expectedNextStart.getTime() !== actualNextStart.getTime()) {
                throw new AppError(
                    `Bi-semanas não são contínuas: ${current.bi_week_id} termina em ${this.formatDate(current.end_date)}, ` +
                    `mas ${next.bi_week_id} começa em ${this.formatDate(next.start_date)}. ` +
                    `Esperado início em ${this.formatDate(expectedNextStart)}`,
                    400
                );
            }
        }
    }

    /**
     * Verifica se dois períodos se sobrepõem
     * 
     * @param {Object} period1 - { startDate, endDate }
     * @param {Object} period2 - { startDate, endDate }
     * @returns {boolean} - True se há sobreposição
     */
    static periodsOverlap(period1, period2) {
        const start1 = new Date(period1.startDate);
        const end1 = new Date(period1.endDate);
        const start2 = new Date(period2.startDate);
        const end2 = new Date(period2.endDate);

        return start1 < end2 && start2 < end1;
    }

    /**
     * Calcula duração de um período em dias
     * 
     * @param {Date} startDate - Data de início
     * @param {Date} endDate - Data de fim
     * @returns {number} - Número de dias
     */
    static calculateDurationInDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffMs = end - start;
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o último dia
    }

    /**
     * Busca bi-semana que contém uma data específica
     * 
     * @param {Date} date - Data a buscar
     * @returns {Promise<Object|null>} - Documento BiWeek ou null
     */
    static async findBiWeekByDate(date) {
        const searchDate = new Date(date);
        searchDate.setUTCHours(0, 0, 0, 0);

        const biWeek = await BiWeek.findOne({
            start_date: { $lte: searchDate },
            end_date: { $gte: searchDate }
        }).exec();

        return biWeek;
    }

    /**
     * Formata data para DD/MM/YYYY
     * 
     * @param {Date} date - Data a formatar
     * @returns {string} - Data formatada
     */
    static formatDate(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    /**
     * Converte período do formato antigo para o novo
     * 
     * @param {Object} oldFormat - Formato antigo { data_inicio, data_fim, bi_week_ids, bi_weeks }
     * @returns {Object} - Formato novo { periodType, startDate, endDate, biWeekIds, biWeeks }
     */
    static convertOldFormatToNew(oldFormat) {
        if (!oldFormat) return null;

        const hasBiWeeks = (oldFormat.bi_week_ids && oldFormat.bi_week_ids.length > 0) ||
                           (oldFormat.bi_weeks && oldFormat.bi_weeks.length > 0);

        return {
            periodType: hasBiWeeks ? PeriodType.BI_WEEK : PeriodType.CUSTOM,
            startDate: oldFormat.data_inicio || oldFormat.startDate,
            endDate: oldFormat.data_fim || oldFormat.endDate,
            biWeekIds: oldFormat.bi_week_ids || oldFormat.biWeekIds || [],
            biWeeks: oldFormat.bi_weeks || oldFormat.biWeeks || []
        };
    }
}

export default PeriodService;

