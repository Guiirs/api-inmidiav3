// validators/placaValidator.js
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose'); // Importa mongoose para validar ObjectId

// Regras de validação para criar ou atualizar uma placa
const placaValidationRules = () => {
    return [
        body('numero_placa')
            .trim()
            .notEmpty().withMessage('O número da placa é obrigatório.')
            .isLength({ max: 50 }).withMessage('Número da placa muito longo (máx 50 caracteres).')
            .escape(), // <-- Adiciona escape

        // Campos opcionais, valida se preenchidos
        body('coordenadas')
            .optional({ checkFalsy: true })
            .trim()
            .matches(/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/).withMessage('Formato de coordenadas inválido (ex: -3.12, -38.45).')
            .isLength({ max: 100 }).withMessage('Coordenadas muito longas (máx 100 caracteres).')
            .escape(), // <-- Adiciona escape (seguro para coordenadas neste formato)

        body('nomeDaRua')
            .optional({ checkFalsy: true })
            .trim()
            .isLength({ max: 255 }).withMessage('Nome da rua muito longo (máx 255 caracteres).')
            .escape(), // <-- Adiciona escape

        body('tamanho')
            .optional({ checkFalsy: true })
            .trim()
            .isLength({ max: 50 }).withMessage('Tamanho muito longo (máx 50 caracteres).')
            .escape(), // <-- Adiciona escape

        // Validação da região (chave 'regiao' contendo ObjectId)
        body('regiao') // IDs geralmente não precisam de escape
            .notEmpty().withMessage('A região é obrigatória.')
            .isMongoId().withMessage('ID da região inválido.'),

        // Validação de imagem não é feita aqui
    ];
};

// Middleware que verifica e formata os erros de validação (inalterado)
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    // Retorna apenas a primeira mensagem de erro
    const firstError = errors.array({ onlyFirstError: true })[0].msg;
    return res.status(400).json({ message: firstError });
};

module.exports = {
    placaValidationRules,
    handleValidationErrors,
};