// validators/biWeekValidator.js
const { body, param, query } = require('express-validator');

/**
 * Validações para criar uma nova Bi-Semana
 */
exports.createBiWeekValidationRules = () => {
    return [
        body('bi_week_id')
            .notEmpty().withMessage('O ID da Bi-Semana é obrigatório.')
            .matches(/^\d{4}-\d{2}$/).withMessage('Formato inválido. Use YYYY-NN (ex: 2026-01).'),
        
        body('ano')
            .notEmpty().withMessage('O ano é obrigatório.')
            .isInt({ min: 2020, max: 2100 }).withMessage('Ano deve ser entre 2020 e 2100.'),
        
        body('numero')
            .notEmpty().withMessage('O número da Bi-Semana é obrigatório.')
            .isInt({ min: 1, max: 26 }).withMessage('Número deve ser entre 1 e 26.'),
        
        body('start_date')
            .notEmpty().withMessage('A data de início é obrigatória.')
            .isISO8601().withMessage('Data de início inválida. Use formato ISO8601 (YYYY-MM-DD).'),
        
        body('end_date')
            .notEmpty().withMessage('A data de término é obrigatória.')
            .isISO8601().withMessage('Data de término inválida. Use formato ISO8601 (YYYY-MM-DD).')
            .custom((value, { req }) => {
                if (new Date(value) <= new Date(req.body.start_date)) {
                    throw new Error('A data de término deve ser posterior à data de início.');
                }
                return true;
            }),
        
        body('descricao')
            .optional()
            .isString().withMessage('A descrição deve ser uma string.')
            .isLength({ max: 200 }).withMessage('A descrição não pode ter mais de 200 caracteres.'),
        
        body('ativo')
            .optional()
            .isBoolean().withMessage('O campo "ativo" deve ser booleano.')
    ];
};

/**
 * Validações para atualizar uma Bi-Semana
 */
exports.updateBiWeekValidationRules = () => {
    return [
        param('id')
            .notEmpty().withMessage('O ID da Bi-Semana é obrigatório.'),
        
        body('bi_week_id')
            .optional()
            .matches(/^\d{4}-\d{2}$/).withMessage('Formato inválido. Use YYYY-NN (ex: 2026-01).'),
        
        body('ano')
            .optional()
            .isInt({ min: 2020, max: 2100 }).withMessage('Ano deve ser entre 2020 e 2100.'),
        
        body('numero')
            .optional()
            .isInt({ min: 1, max: 26 }).withMessage('Número deve ser entre 1 e 26.'),
        
        body('start_date')
            .optional()
            .isISO8601().withMessage('Data de início inválida.'),
        
        body('end_date')
            .optional()
            .isISO8601().withMessage('Data de término inválida.')
            .custom((value, { req }) => {
                if (req.body.start_date && new Date(value) <= new Date(req.body.start_date)) {
                    throw new Error('A data de término deve ser posterior à data de início.');
                }
                return true;
            }),
        
        body('descricao')
            .optional()
            .isString().withMessage('A descrição deve ser uma string.')
            .isLength({ max: 200 }).withMessage('A descrição não pode ter mais de 200 caracteres.'),
        
        body('ativo')
            .optional()
            .isBoolean().withMessage('O campo "ativo" deve ser booleano.')
    ];
};

/**
 * Validações para buscar por ID
 */
exports.idValidationRules = () => {
    return [
        param('id')
            .notEmpty().withMessage('O ID é obrigatório.')
    ];
};

/**
 * Validações para gerar calendário
 */
exports.generateCalendarValidationRules = () => {
    return [
        body('ano')
            .notEmpty().withMessage('O ano é obrigatório.')
            .isInt({ min: 2020, max: 2100 }).withMessage('Ano deve ser entre 2020 e 2100.'),
        
        body('overwrite')
            .optional()
            .isBoolean().withMessage('O campo "overwrite" deve ser booleano.')
    ];
};

/**
 * Validações para validar período
 */
exports.validatePeriodRules = () => {
    return [
        body('start_date')
            .notEmpty().withMessage('A data de início é obrigatória.')
            .isISO8601().withMessage('Data de início inválida.'),
        
        body('end_date')
            .notEmpty().withMessage('A data de término é obrigatória.')
            .isISO8601().withMessage('Data de término inválida.')
            .custom((value, { req }) => {
                if (new Date(value) <= new Date(req.body.start_date)) {
                    throw new Error('A data de término deve ser posterior à data de início.');
                }
                return true;
            })
    ];
};

/**
 * Validações para buscar por data
 */
exports.findByDateValidationRules = () => {
    return [
        query('date')
            .notEmpty().withMessage('A data é obrigatória.')
            .isISO8601().withMessage('Data inválida. Use formato ISO8601 (YYYY-MM-DD).')
    ];
};

/**
 * Validações para filtros de calendário
 */
exports.calendarFilterValidationRules = () => {
    return [
        query('ano')
            .optional()
            .isInt({ min: 2020, max: 2100 }).withMessage('Ano deve ser entre 2020 e 2100.'),
        
        query('ativo')
            .optional()
            .isIn(['true', 'false']).withMessage('O campo "ativo" deve ser "true" ou "false".')
    ];
};
