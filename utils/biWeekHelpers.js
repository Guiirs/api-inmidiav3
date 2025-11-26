// utils/biWeekHelpers.js
const BiWeek = require('../models/BiWeek');
const logger = require('../config/logger');
const AppError = require('./AppError');

/**
 * Utilitários para trabalhar com Bi-Semanas (quinzenas de 14 dias)
 */
class BiWeekHelpers {
    
    /**
     * Encontra todas as bi-semanas que um período abrange
     * @param {Date} startDate - Data de início
     * @param {Date} endDate - Data de fim
     * @returns {Promise<Array>} - Array de bi-semanas encontradas
     */
    static async findBiWeeksInRange(startDate, endDate) {
        logger.debug(`[BiWeekHelpers] Buscando bi-semanas entre ${startDate} e ${endDate}`);
        
        try {
            const biWeeks = await BiWeek.find({
                $or: [
                    // Bi-Semana começa dentro do período
                    { start_date: { $gte: startDate, $lte: endDate } },
                    // Bi-Semana termina dentro do período
                    { end_date: { $gte: startDate, $lte: endDate } },
                    // Período está completamente dentro de uma Bi-Semana
                    { start_date: { $lte: startDate }, end_date: { $gte: endDate } }
                ],
                ativo: true
            }).sort({ start_date: 1 }).exec();
            
            logger.debug(`[BiWeekHelpers] Encontradas ${biWeeks.length} bi-semanas`);
            return biWeeks;
            
        } catch (error) {
            logger.error(`[BiWeekHelpers] Erro ao buscar bi-semanas: ${error.message}`);
            throw error;
        }
    }

    /**
     * Valida se um período está perfeitamente alinhado com bi-semanas
     * @param {Date} startDate - Data de início
     * @param {Date} endDate - Data de fim
     * @returns {Promise<object>} - { valid: boolean, biWeeks: Array, message: string, suggestion: object }
     */
    static async validatePeriodAlignment(startDate, endDate) {
        logger.debug(`[BiWeekHelpers] Validando alinhamento do período`);
        
        const biWeeks = await this.findBiWeeksInRange(startDate, endDate);
        
        if (biWeeks.length === 0) {
            return {
                valid: false,
                biWeeks: [],
                message: 'Nenhuma bi-semana encontrada para este período.',
                suggestion: null
            };
        }
        
        const firstBiWeek = biWeeks[0];
        const lastBiWeek = biWeeks[biWeeks.length - 1];
        
        // Verifica alinhamento perfeito
        const startAligned = startDate.getTime() === firstBiWeek.start_date.getTime();
        const endAligned = endDate.getTime() === lastBiWeek.end_date.getTime();
        
        if (startAligned && endAligned) {
            return {
                valid: true,
                biWeeks,
                message: `Período perfeitamente alinhado com ${biWeeks.length} bi-semana(s).`,
                suggestion: null
            };
        }
        
        return {
            valid: false,
            biWeeks,
            message: 'O período não está alinhado com os limites das bi-semanas.',
            suggestion: {
                start_date: firstBiWeek.start_date,
                end_date: lastBiWeek.end_date,
                message: `Sugestão: ${this.formatDate(firstBiWeek.start_date)} até ${this.formatDate(lastBiWeek.end_date)}`
            }
        };
    }

    /**
     * Ajusta automaticamente um período para alinhar com bi-semanas
     * @param {Date} startDate - Data de início aproximada
     * @param {Date} endDate - Data de fim aproximada
     * @returns {Promise<object>} - { start_date: Date, end_date: Date, biWeeks: Array }
     */
    static async alignPeriodToBiWeeks(startDate, endDate) {
        logger.debug(`[BiWeekHelpers] Alinhando período às bi-semanas`);
        
        const biWeeks = await this.findBiWeeksInRange(startDate, endDate);
        
        if (biWeeks.length === 0) {
            throw new AppError('Não foi possível encontrar bi-semanas para este período.', 404);
        }
        
        const firstBiWeek = biWeeks[0];
        const lastBiWeek = biWeeks[biWeeks.length - 1];
        
        return {
            start_date: firstBiWeek.start_date,
            end_date: lastBiWeek.end_date,
            biWeeks,
            adjusted: true,
            message: `Período ajustado para ${biWeeks.length} bi-semana(s) completa(s).`
        };
    }

    /**
     * Encontra a bi-semana que contém uma data específica
     * @param {Date} date - Data para buscar
     * @returns {Promise<object|null>} - Bi-semana encontrada ou null
     */
    static async findBiWeekByDate(date) {
        logger.debug(`[BiWeekHelpers] Buscando bi-semana para data: ${date}`);
        
        try {
            const biWeek = await BiWeek.findOne({
                start_date: { $lte: date },
                end_date: { $gte: date },
                ativo: true
            }).exec();
            
            return biWeek;
            
        } catch (error) {
            logger.error(`[BiWeekHelpers] Erro ao buscar bi-semana: ${error.message}`);
            throw error;
        }
    }

    /**
     * Busca bi-semanas por IDs (ex: ['2025-01', '2025-02'])
     * @param {Array<string>} biWeekIds - Array de IDs de bi-semanas
     * @returns {Promise<Array>} - Array de bi-semanas encontradas
     */
    static async findBiWeeksByIds(biWeekIds) {
        logger.debug(`[BiWeekHelpers] Buscando ${biWeekIds.length} bi-semanas por ID`);
        
        try {
            const biWeeks = await BiWeek.find({
                bi_week_id: { $in: biWeekIds },
                ativo: true
            }).sort({ start_date: 1 }).exec();
            
            return biWeeks;
            
        } catch (error) {
            logger.error(`[BiWeekHelpers] Erro ao buscar bi-semanas: ${error.message}`);
            throw error;
        }
    }

    /**
     * Calcula o período (start_date, end_date) a partir de IDs de bi-semanas
     * @param {Array<string>} biWeekIds - Array de IDs de bi-semanas (ex: ['2025-01', '2025-02'])
     * @returns {Promise<object>} - { start_date: Date, end_date: Date, biWeeks: Array }
     */
    static async calculatePeriodFromBiWeekIds(biWeekIds) {
        logger.debug(`[BiWeekHelpers] Calculando período para bi-semanas: ${biWeekIds.join(', ')}`);
        
        if (!biWeekIds || biWeekIds.length === 0) {
            throw new AppError('Nenhuma bi-semana fornecida.', 400);
        }
        
        const biWeeks = await this.findBiWeeksByIds(biWeekIds);
        
        if (biWeeks.length === 0) {
            throw new AppError('Nenhuma bi-semana encontrada com os IDs fornecidos.', 404);
        }
        
        if (biWeeks.length !== biWeekIds.length) {
            logger.warn(`[BiWeekHelpers] Algumas bi-semanas não foram encontradas. Solicitadas: ${biWeekIds.length}, Encontradas: ${biWeeks.length}`);
        }
        
        // Ordena por data de início
        biWeeks.sort((a, b) => a.start_date - b.start_date);
        
        const start_date = biWeeks[0].start_date;
        const end_date = biWeeks[biWeeks.length - 1].end_date;
        
        return {
            start_date,
            end_date,
            biWeeks,
            count: biWeeks.length
        };
    }

    /**
     * Valida se um conjunto de bi-week_ids é sequencial (sem gaps)
     * @param {Array<string>} biWeekIds - Array de IDs (ex: ['2025-01', '2025-02', '2025-03'])
     * @returns {Promise<object>} - { valid: boolean, message: string, gaps: Array }
     */
    static async validateBiWeekSequence(biWeekIds) {
        logger.debug(`[BiWeekHelpers] Validando sequência de bi-semanas`);
        
        if (!biWeekIds || biWeekIds.length === 0) {
            return { valid: false, message: 'Nenhuma bi-semana fornecida.', gaps: [] };
        }
        
        if (biWeekIds.length === 1) {
            return { valid: true, message: 'Apenas uma bi-semana.', gaps: [] };
        }
        
        const biWeeks = await this.findBiWeeksByIds(biWeekIds);
        
        if (biWeeks.length !== biWeekIds.length) {
            return { 
                valid: false, 
                message: 'Algumas bi-semanas não foram encontradas.', 
                gaps: [] 
            };
        }
        
        // Ordena por data
        biWeeks.sort((a, b) => a.start_date - b.start_date);
        
        const gaps = [];
        
        for (let i = 0; i < biWeeks.length - 1; i++) {
            const current = biWeeks[i];
            const next = biWeeks[i + 1];
            
            // Verifica se há gap entre as bi-semanas
            // O fim de uma deve ser 1 dia antes do início da próxima
            const expectedNextStart = new Date(current.end_date);
            expectedNextStart.setDate(expectedNextStart.getDate() + 1);
            expectedNextStart.setHours(0, 0, 0, 0);
            
            const actualNextStart = new Date(next.start_date);
            actualNextStart.setHours(0, 0, 0, 0);
            
            if (expectedNextStart.getTime() !== actualNextStart.getTime()) {
                gaps.push({
                    after: current.bi_week_id,
                    before: next.bi_week_id,
                    gap_days: Math.floor((actualNextStart - expectedNextStart) / (1000 * 60 * 60 * 24))
                });
            }
        }
        
        if (gaps.length > 0) {
            return {
                valid: false,
                message: `Encontrados ${gaps.length} gap(s) na sequência de bi-semanas.`,
                gaps
            };
        }
        
        return {
            valid: true,
            message: 'Bi-semanas formam uma sequência contínua.',
            gaps: []
        };
    }

    /**
     * Formata uma data no padrão brasileiro
     * @param {Date} date - Data para formatar
     * @returns {string} - Data formatada (dd/mm/yyyy)
     */
    static formatDate(date) {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    /**
     * Formata uma data com hora no padrão brasileiro
     * @param {Date} date - Data para formatar
     * @returns {string} - Data e hora formatada (dd/mm/yyyy HH:mm)
     */
    static formatDateTime(date) {
        return new Date(date).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Gera uma descrição legível do período de bi-semanas
     * @param {Array} biWeeks - Array de bi-semanas
     * @returns {string} - Descrição formatada
     */
    static generatePeriodDescription(biWeeks) {
        if (!biWeeks || biWeeks.length === 0) {
            return 'Período não definido';
        }
        
        if (biWeeks.length === 1) {
            const bw = biWeeks[0];
            return `Bi-semana ${bw.numero}/${bw.ano} (${this.formatDate(bw.start_date)} - ${this.formatDate(bw.end_date)})`;
        }
        
        const first = biWeeks[0];
        const last = biWeeks[biWeeks.length - 1];
        
        if (first.ano === last.ano) {
            return `${biWeeks.length} bi-semanas (${first.numero} a ${last.numero}/${first.ano})`;
        }
        
        return `${biWeeks.length} bi-semanas (${first.bi_week_id} a ${last.bi_week_id})`;
    }
}

module.exports = BiWeekHelpers;
