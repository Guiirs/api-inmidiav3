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
            .notEmpty().withMessage('O tipo de período é obrigatório.') // <-- ALTERAÇÃO AQUI
            .isIn(['quinzenal', 'mensal']).withMessage("O tipo de período deve ser 'quinzenal' ou 'mensal'."),

        body('dataInicio')
            .notEmpty().withMessage('Data de início é obrigária.')
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
            .escape(),

        // --- VALIDAÇÕES NOVAS ADICIONADAS ---

        // Validação para a Forma de Pagamento
        // É opcional, mas se vier, limpamos (trim) e escapamos (escape)
        body('formaPagamento')
            .optional()
            .trim()
            .escape(),

        // Validação para as Placas
        // É opcional, mas se vier, deve ser um array
        body('placas')
            .optional()
            .isArray().withMessage('A lista de placas deve ser um array.'),
        
        // Valida cada item dentro do array 'placas'
        body('placas.*')
            .optional()
            .isMongoId().withMessage('Cada ID de placa na lista deve ser um MongoId válido.')
    ];
};

module.exports = {
    piValidationRules,
    validateIdParam,
    handleValidationErrors, // Reexporta o handler
};