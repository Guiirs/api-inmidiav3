// services/biWeekService.js
const BiWeek = require('../models/BiWeek');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

/**
 * Service para gerenciamento do calendário de Bi-Semanas (períodos de 14 dias).
 * Numeradas de 2 em 2: 02, 04, 06... 52 (26 bi-semanas por ano).
 */
class BiWeekService {
    constructor() {}

    /**
     * Busca todas as Bi-Semanas com filtros opcionais
     * @param {object} filters - { ano, ativo }
     * @returns {Promise<Array>} - Array de Bi-Semanas
     */
    async getAllBiWeeks(filters = {}) {
        logger.info('[BiWeekService] Buscando todas as Bi-Semanas.');
        
        try {
            const query = {};
            
            if (filters.ano) {
                query.ano = parseInt(filters.ano, 10);
            }
            
            if (filters.ativo !== undefined) {
                query.ativo = filters.ativo === 'true' || filters.ativo === true;
            }
            
            const biWeeks = await BiWeek.find(query)
                .sort({ ano: 1, numero: 1 })
                .lean();
            
            logger.info(`[BiWeekService] ${biWeeks.length} Bi-Semanas encontradas.`);
            return biWeeks;
            
        } catch (error) {
            logger.error(`[BiWeekService] Erro ao buscar Bi-Semanas: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro ao buscar calendário de Bi-Semanas: ${error.message}`, 500);
        }
    }

    /**
     * Busca uma Bi-Semana específica por ID
     * @param {string} id - ObjectId ou bi_week_id
     * @returns {Promise<object>} - Bi-Semana encontrada
     */
    async getBiWeekById(id) {
        logger.info(`[BiWeekService] Buscando Bi-Semana ID: ${id}`);
        
        try {
            // Tenta buscar por _id (ObjectId) ou por bi_week_id (string)
            const biWeek = await BiWeek.findOne({
                $or: [
                    { _id: id },
                    { bi_week_id: id }
                ]
            }).lean();
            
            if (!biWeek) {
                throw new AppError('Bi-Semana não encontrada.', 404);
            }
            
            logger.info(`[BiWeekService] Bi-Semana encontrada: ${biWeek.bi_week_id}`);
            return biWeek;
            
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error(`[BiWeekService] Erro ao buscar Bi-Semana por ID: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro ao buscar Bi-Semana: ${error.message}`, 500);
        }
    }

    /**
     * Cria uma nova Bi-Semana
     * @param {object} biWeekData - { bi_week_id, ano, numero, start_date, end_date, descricao }
     * @returns {Promise<object>} - Bi-Semana criada
     */
    async createBiWeek(biWeekData) {
        logger.info(`[BiWeekService] Criando nova Bi-Semana: ${biWeekData.bi_week_id}`);
        
        try {
            // Valida se já existe
            const exists = await BiWeek.findOne({ bi_week_id: biWeekData.bi_week_id }).lean();
            if (exists) {
                throw new AppError(`Bi-Semana ${biWeekData.bi_week_id} já existe.`, 409);
            }
            
            // Converte strings de data para Date
            const data = {
                ...biWeekData,
                start_date: new Date(biWeekData.start_date),
                end_date: new Date(biWeekData.end_date)
            };
            
            // Ajusta horas
            data.start_date.setUTCHours(0, 0, 0, 0);
            data.end_date.setUTCHours(23, 59, 59, 999);
            
            const newBiWeek = new BiWeek(data);
            await newBiWeek.save();
            
            logger.info(`[BiWeekService] Bi-Semana ${newBiWeek.bi_week_id} criada com sucesso.`);
            return newBiWeek.toJSON();
            
        } catch (error) {
            if (error instanceof AppError) throw error;
            if (error.code === 11000) {
                throw new AppError('Bi-Semana duplicada.', 409);
            }
            logger.error(`[BiWeekService] Erro ao criar Bi-Semana: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro ao criar Bi-Semana: ${error.message}`, 500);
        }
    }

    /**
     * Atualiza uma Bi-Semana existente
     * @param {string} id - ObjectId ou bi_week_id
     * @param {object} updateData - Campos a atualizar
     * @returns {Promise<object>} - Bi-Semana atualizada
     */
    async updateBiWeek(id, updateData) {
        logger.info(`[BiWeekService] Atualizando Bi-Semana ID: ${id}`);
        
        try {
            // Converte datas se fornecidas
            if (updateData.start_date) {
                updateData.start_date = new Date(updateData.start_date);
                updateData.start_date.setUTCHours(0, 0, 0, 0);
            }
            
            if (updateData.end_date) {
                updateData.end_date = new Date(updateData.end_date);
                updateData.end_date.setUTCHours(23, 59, 59, 999);
            }
            
            const updatedBiWeek = await BiWeek.findOneAndUpdate(
                { $or: [{ _id: id }, { bi_week_id: id }] },
                updateData,
                { new: true, runValidators: true }
            );
            
            if (!updatedBiWeek) {
                throw new AppError('Bi-Semana não encontrada.', 404);
            }
            
            logger.info(`[BiWeekService] Bi-Semana ${updatedBiWeek.bi_week_id} atualizada.`);
            return updatedBiWeek.toJSON();
            
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error(`[BiWeekService] Erro ao atualizar Bi-Semana: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro ao atualizar Bi-Semana: ${error.message}`, 500);
        }
    }

    /**
     * Deleta uma Bi-Semana
     * @param {string} id - ObjectId ou bi_week_id
     * @returns {Promise<void>}
     */
    async deleteBiWeek(id) {
        logger.info(`[BiWeekService] Deletando Bi-Semana ID: ${id}`);
        
        try {
            const deletedBiWeek = await BiWeek.findOneAndDelete({
                $or: [{ _id: id }, { bi_week_id: id }]
            });
            
            if (!deletedBiWeek) {
                throw new AppError('Bi-Semana não encontrada.', 404);
            }
            
            logger.info(`[BiWeekService] Bi-Semana ${deletedBiWeek.bi_week_id} deletada.`);
            
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error(`[BiWeekService] Erro ao deletar Bi-Semana: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro ao deletar Bi-Semana: ${error.message}`, 500);
        }
    }

    /**
     * Gera automaticamente o calendário de Bi-Semanas para um ano
     * @param {number} ano - Ano para gerar
     * @param {boolean} overwrite - Se true, substitui Bi-Semanas existentes
     * @param {string|Date} customStartDate - Data de início customizada (opcional)
     * @returns {Promise<object>} - { created: Number, skipped: Number }
     */
    async generateCalendar(ano, overwrite = false, customStartDate = null) {
        logger.info(`[BiWeekService] Gerando calendário para o ano ${ano} (overwrite: ${overwrite}, customStartDate: ${customStartDate}).`);
        
        try {
            const anoInt = parseInt(ano, 10);
            
            if (isNaN(anoInt) || anoInt < 2020 || anoInt > 2100) {
                throw new AppError('Ano inválido. Use um ano entre 2020 e 2100.', 400);
            }
            
            // Gera o calendário usando o método estático do model com data customizada
            const biWeeksData = BiWeek.generateCalendar(anoInt, customStartDate);
            logger.info(`[BiWeekService] Calendário gerado pelo model: ${biWeeksData.length} bi-semanas`);
            
            let created = 0;
            let skipped = 0;
            
            for (const data of biWeeksData) {
                const exists = await BiWeek.findOne({ bi_week_id: data.bi_week_id }).lean();
                
                if (exists && !overwrite) {
                    skipped++;
                    logger.debug(`[BiWeekService] Bi-Semana ${data.bi_week_id} já existe. Pulando...`);
                    continue;
                }
                
                if (exists && overwrite) {
                    await BiWeek.findOneAndUpdate(
                        { bi_week_id: data.bi_week_id },
                        data,
                        { runValidators: true }
                    );
                    created++;
                    logger.debug(`[BiWeekService] Bi-Semana ${data.bi_week_id} atualizada (overwrite).`);
                } else {
                    await BiWeek.create(data);
                    created++;
                    logger.debug(`[BiWeekService] Bi-Semana ${data.bi_week_id} criada.`);
                }
            }
            
            logger.info(`[BiWeekService] Calendário gerado: ${created} criadas, ${skipped} puladas.`);
            
            return { 
                created, 
                skipped, 
                total: biWeeksData.length,
                message: `Calendário de ${ano} gerado com sucesso.`
            };
            
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error(`[BiWeekService] Erro ao gerar calendário: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro ao gerar calendário: ${error.message}`, 500);
        }
    }

    /**
     * Valida se um período está alinhado com Bi-Semanas
     * @param {string|Date} startDate - Data de início
     * @param {string|Date} endDate - Data de fim
     * @returns {Promise<object>} - { valid: Boolean, message: String, biWeeks: Array, suggestion: Object }
     */
    async validatePeriod(startDate, endDate) {
        logger.info(`[BiWeekService] Validando período: ${startDate} até ${endDate}`);
        
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new AppError('Datas inválidas fornecidas.', 400);
            }
            
            if (end <= start) {
                throw new AppError('A data de fim deve ser posterior à data de início.', 400);
            }
            
            // Usa o método estático do model
            const validation = await BiWeek.validatePeriod(start, end);
            
            logger.info(`[BiWeekService] Validação: ${validation.valid ? 'VÁLIDO' : 'INVÁLIDO'} - ${validation.message}`);
            
            return validation;
            
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error(`[BiWeekService] Erro ao validar período: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro ao validar período: ${error.message}`, 500);
        }
    }

    /**
     * Busca a Bi-Semana que contém uma data específica
     * @param {string|Date} date - Data a buscar
     * @returns {Promise<object|null>} - Bi-Semana encontrada ou null
     */
    async findBiWeekByDate(date) {
        logger.info(`[BiWeekService] Buscando Bi-Semana para a data: ${date}`);
        
        try {
            const searchDate = new Date(date);
            
            if (isNaN(searchDate.getTime())) {
                throw new AppError('Data inválida fornecida.', 400);
            }
            
            const biWeek = await BiWeek.findByDate(searchDate);
            
            if (!biWeek) {
                logger.info(`[BiWeekService] Nenhuma Bi-Semana encontrada para ${date}.`);
                return null;
            }
            
            logger.info(`[BiWeekService] Bi-Semana encontrada: ${biWeek.bi_week_id}`);
            return biWeek.toJSON();
            
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error(`[BiWeekService] Erro ao buscar Bi-Semana por data: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro ao buscar Bi-Semana por data: ${error.message}`, 500);
        }
    }

    /**
     * Lista os anos disponíveis no calendário
     * @returns {Promise<Array>} - Array de anos
     */
    async getAvailableYears() {
        logger.info('[BiWeekService] Buscando anos disponíveis.');
        
        try {
            const years = await BiWeek.distinct('ano');
            years.sort((a, b) => a - b);
            
            logger.info(`[BiWeekService] Anos disponíveis: ${years.join(', ')}`);
            return years;
            
        } catch (error) {
            logger.error(`[BiWeekService] Erro ao buscar anos: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro ao buscar anos disponíveis: ${error.message}`, 500);
        }
    }
}

module.exports = BiWeekService;
