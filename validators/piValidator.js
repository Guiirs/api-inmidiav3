// validators/piValidator.js
const { body, param } = require('express-validator');
// Reutiliza o handler de erros existente
const { handleValidationErrors } = require('./authValidator');
const mongoose = require('mongoose');

// Validação para o ID na URL
const validateIdParam = [
    param('id').isMongoId().withMessage('O ID da PI fornecido é inválido.')
];

// Regras de validação para criar ou atualizar uma PI
const piValidationRules = () => {
    return [
        body('clienteId')
            .notEmpty().withMessage('O cliente é obrigatório.')
            .isMongoId().withMessage('ID do cliente inválido.'),
        
        body('tipoPeriodo')
            .isIn(['quinzenal', 'mensal']).withMessage("O tipo de período deve ser 'quinzenal' ou 'mensal'."),

        body('dataInicio')
            .notEmpty().withMessage('Data de início é obrigatória.')
            .isISO8601().withMessage('Data de início inválida (formato YYYY-MM-DD).')
            .toDate(),

        body('dataFim')
            .notEmpty().withMessage('Data final é obrigatória.')
            .isISO8601().withMessage('Data final inválida (formato YYYY-MM-DD).')
            .toDate()
            .custom((value, { req }) => {
                 if (!req.body.dataInicio || value <= req.body.dataInicio) {
                     throw new Error('A data final deve ser posterior à data inicial.');
                 }
                 return true;
             }),
        
        body('valorTotal')
            .notEmpty().withMessage('O valor total é obrigatório.')
            .isNumeric().withMessage('O valor total deve ser um número.'),
        
        body('descricao')
            .trim()
            .notEmpty().withMessage('A descrição é obrigatória.')
            .escape()
    ];
};

module.exports = {
    piValidationRules,
    validateIdParam,
    handleValidationErrors, // Reexporta o handler
};