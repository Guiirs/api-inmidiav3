// validators/placaValidator.js
const { body, validationResult } = require('express-validator');

// Regras de validação para criar ou atualizar uma placa
const placaValidationRules = () => {
    return [
        body('numero_placa').notEmpty().withMessage('O número da placa é obrigatório.'),
        body('coordenadas').notEmpty().withMessage('As coordenadas são obrigatórias.'),
        body('nomeDaRua').notEmpty().withMessage('O nome da rua é obrigatório.'),
        body('tamanho').notEmpty().withMessage('O tamanho é obrigatório.'),
        body('regiao_id').isInt({ gt: 0 }).withMessage('A região é obrigatória.'),
        body('imagem').optional({ checkFalsy: true }).isURL().withMessage('A URL da imagem fornecida não é válida.')
    ];
};

// Middleware que verifica e formata os erros de validação (pode ser reutilizado)
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    const extractedErrors = [];
    errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

    return res.status(400).json({
        errors: extractedErrors,
    });
};

module.exports = {
    placaValidationRules,
    handleValidationErrors,
};