// validators/aluguelValidator.js
const { body, param } = require('express-validator');
const BiWeek = require('../models/BiWeek');
const Empresa = require('../models/Empresa');
const logger = require('../config/logger');

/**
 * Validação base para criar aluguel (sem validação de Bi-Semana)
 */
exports.validateAluguel = [
    body('placa_id')
        .notEmpty().withMessage('ID da placa é obrigatório.')
        .isMongoId().withMessage('ID da placa inválido.'),

    body('cliente_id')
        .notEmpty().withMessage('ID do cliente é obrigatório.')
        .isMongoId().withMessage('ID do cliente inválido.'),

    body('data_inicio')
        .notEmpty().withMessage('Data de início é obrigatória.')
        .isISO8601().withMessage('Data de início inválida (formato YYYY-MM-DD).')
        .toDate(),

    body('data_fim')
        .notEmpty().withMessage('Data final é obrigatória.')
        .isISO8601().withMessage('Data final inválida (formato YYYY-MM-DD).')
        .toDate()
        .custom((value, { req }) => {
            if (!req.body.data_inicio || value <= req.body.data_inicio) {
                throw new Error('A data final deve ser posterior à data inicial.');
            }
            return true;
        }),
];

/**
 * Validação ADICIONAL para Bi-Semana (14 dias)
 * Esta validação verifica se as datas do aluguel estão alinhadas com Bi-Semanas cadastradas.
 * 
 * ATENÇÃO: Esta validação só é aplicada se:
 * 1. A empresa tiver o campo `enforce_bi_week_validation: true`
 * 2. Houver Bi-Semanas cadastradas no banco de dados
 * 
 * Caso contrário, a validação é PULADA, permitindo datas flexíveis.
 */
exports.validateBiWeekAlignment = async (req, res, next) => {
    try {
        const { data_inicio, data_fim } = req.body;
        
        // Se não há datas no body, pula (a validação base já capturou)
        if (!data_inicio || !data_fim) {
            return next();
        }
        
        const empresaId = req.user.empresaId;
        
        // Verifica se a empresa quer forçar validação de Bi-Semana
        const empresa = await Empresa.findById(empresaId).select('enforce_bi_week_validation').lean();
        
        if (!empresa || !empresa.enforce_bi_week_validation) {
            // Validação de Bi-Semana desabilitada para esta empresa
            logger.debug(`[AluguelValidator] Validação de Bi-Semana desabilitada para empresa ${empresaId}.`);
            return next();
        }
        
        logger.info(`[AluguelValidator] Validando alinhamento de Bi-Semana para empresa ${empresaId}.`);
        
        // Converte para Date (podem já estar convertidos)
        const startDate = data_inicio instanceof Date ? data_inicio : new Date(data_inicio);
        const endDate = data_fim instanceof Date ? data_fim : new Date(data_fim);
        
        // Usa o método estático do model BiWeek
        const validation = await BiWeek.validatePeriod(startDate, endDate);
        
        if (!validation.valid) {
            logger.warn(`[AluguelValidator] Período não alinhado com Bi-Semanas: ${validation.message}`);
            
            // Retorna erro com sugestão de correção
            return res.status(400).json({
                success: false,
                message: 'As datas do aluguel devem estar alinhadas com os períodos de Bi-Semana (14 dias) cadastrados.',
                details: validation.message,
                suggestion: validation.suggestion ? {
                    start_date: validation.suggestion.start_date.toISOString().split('T')[0],
                    end_date: validation.suggestion.end_date.toISOString().split('T')[0]
                } : null,
                bi_weeks_found: validation.biWeeks.map(bw => ({
                    bi_week_id: bw.bi_week_id,
                    start_date: bw.start_date.toISOString().split('T')[0],
                    end_date: bw.end_date.toISOString().split('T')[0]
                }))
            });
        }
        
        logger.info(`[AluguelValidator] Período válido: ${validation.message}`);
        
        // Anexa as Bi-Semanas validadas ao request para uso futuro (opcional)
        req.validatedBiWeeks = validation.biWeeks;
        
        next();
        
    } catch (error) {
        logger.error(`[AluguelValidator] Erro ao validar Bi-Semana: ${error.message}`, { stack: error.stack });
        // Em caso de erro, permite continuar (fail-open para não quebrar o fluxo)
        next();
    }
};

/**
 * Validação para IDs nos parâmetros da URL
 */
exports.validateIdParam = [
    param('id').isMongoId().withMessage('O ID do aluguel fornecido é inválido.')
];

exports.validatePlacaIdParam = [
    param('placaId').isMongoId().withMessage('O ID da placa fornecido é inválido.')
];
