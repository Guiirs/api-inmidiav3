// controllers/biWeekController.js
const BiWeekService = require('../services/biWeekService');
const logger = require('../config/logger');

const biWeekService = new BiWeekService();

/**
 * GET /api/v1/bi-weeks/calendar
 * Retorna o calendário completo de Bi-Semanas com filtros opcionais
 */
exports.getCalendar = async (req, res, next) => {
    logger.info('[BiWeekController] Requisição para obter calendário de Bi-Semanas.');
    
    try {
        const { ano, ativo } = req.query;
        
        const biWeeks = await biWeekService.getAllBiWeeks({ ano, ativo });
        
        res.status(200).json({
            success: true,
            count: biWeeks.length,
            data: biWeeks
        });
        
    } catch (error) {
        logger.error(`[BiWeekController] Erro em getCalendar: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * GET /api/v1/bi-weeks/years
 * Retorna lista de anos disponíveis no calendário
 */
exports.getYears = async (req, res, next) => {
    logger.info('[BiWeekController] Requisição para obter anos disponíveis.');
    
    try {
        const years = await biWeekService.getAvailableYears();
        
        res.status(200).json({
            success: true,
            data: years
        });
        
    } catch (error) {
        logger.error(`[BiWeekController] Erro em getYears: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * GET /api/v1/bi-weeks/:id
 * Retorna uma Bi-Semana específica por ID
 */
exports.getBiWeekById = async (req, res, next) => {
    const { id } = req.params;
    logger.info(`[BiWeekController] Requisição para obter Bi-Semana ID: ${id}`);
    
    try {
        const biWeek = await biWeekService.getBiWeekById(id);
        
        res.status(200).json({
            success: true,
            data: biWeek
        });
        
    } catch (error) {
        logger.error(`[BiWeekController] Erro em getBiWeekById: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * POST /api/v1/bi-weeks
 * Cria uma nova Bi-Semana
 */
exports.createBiWeek = async (req, res, next) => {
    logger.info('[BiWeekController] Requisição para criar nova Bi-Semana.');
    
    try {
        const newBiWeek = await biWeekService.createBiWeek(req.body);
        
        res.status(201).json({
            success: true,
            message: 'Bi-Semana criada com sucesso.',
            data: newBiWeek
        });
        
    } catch (error) {
        logger.error(`[BiWeekController] Erro em createBiWeek: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * PUT /api/v1/bi-weeks/:id
 * Atualiza uma Bi-Semana existente
 */
exports.updateBiWeek = async (req, res, next) => {
    const { id } = req.params;
    logger.info(`[BiWeekController] Requisição para atualizar Bi-Semana ID: ${id}`);
    
    try {
        const updatedBiWeek = await biWeekService.updateBiWeek(id, req.body);
        
        res.status(200).json({
            success: true,
            message: 'Bi-Semana atualizada com sucesso.',
            data: updatedBiWeek
        });
        
    } catch (error) {
        logger.error(`[BiWeekController] Erro em updateBiWeek: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * DELETE /api/v1/bi-weeks/:id
 * Deleta uma Bi-Semana
 */
exports.deleteBiWeek = async (req, res, next) => {
    const { id } = req.params;
    logger.info(`[BiWeekController] Requisição para deletar Bi-Semana ID: ${id}`);
    
    try {
        await biWeekService.deleteBiWeek(id);
        
        res.status(200).json({
            success: true,
            message: 'Bi-Semana deletada com sucesso.'
        });
        
    } catch (error) {
        logger.error(`[BiWeekController] Erro em deleteBiWeek: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * POST /api/v1/bi-weeks/generate
 * Gera automaticamente o calendário para um ano
 */
exports.generateCalendar = async (req, res, next) => {
    const { ano, overwrite } = req.body;
    logger.info(`[BiWeekController] Requisição para gerar calendário do ano ${ano}.`);
    
    try {
        if (!ano) {
            return res.status(400).json({
                success: false,
                message: 'O campo "ano" é obrigatório.'
            });
        }
        
        const result = await biWeekService.generateCalendar(ano, overwrite);
        
        res.status(201).json({
            success: true,
            ...result
        });
        
    } catch (error) {
        logger.error(`[BiWeekController] Erro em generateCalendar: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * POST /api/v1/bi-weeks/validate
 * Valida se um período está alinhado com Bi-Semanas
 */
exports.validatePeriod = async (req, res, next) => {
    const { start_date, end_date } = req.body;
    logger.info(`[BiWeekController] Requisição para validar período: ${start_date} - ${end_date}`);
    
    try {
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'Os campos "start_date" e "end_date" são obrigatórios.'
            });
        }
        
        const validation = await biWeekService.validatePeriod(start_date, end_date);
        
        res.status(200).json({
            success: true,
            ...validation
        });
        
    } catch (error) {
        logger.error(`[BiWeekController] Erro em validatePeriod: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * GET /api/v1/bi-weeks/find-by-date
 * Busca a Bi-Semana que contém uma data específica
 */
exports.findByDate = async (req, res, next) => {
    const { date } = req.query;
    logger.info(`[BiWeekController] Requisição para buscar Bi-Semana na data: ${date}`);
    
    try {
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'O parâmetro "date" é obrigatório.'
            });
        }
        
        const biWeek = await biWeekService.findBiWeekByDate(date);
        
        if (!biWeek) {
            return res.status(404).json({
                success: false,
                message: 'Nenhuma Bi-Semana encontrada para a data especificada.'
            });
        }
        
        res.status(200).json({
            success: true,
            data: biWeek
        });
        
    } catch (error) {
        logger.error(`[BiWeekController] Erro em findByDate: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

module.exports = exports;
