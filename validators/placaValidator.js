// validators/placaValidator.js
const { body, query, validationResult } = require('express-validator');
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

// Validação para query params de disponibilidade (data_inicio e data_fim)
// Aceita tanto camelCase (dataInicio/dataFim) quanto snake_case (data_inicio/data_fim)
const disponibilidadeValidationRules = () => {
    return [
        // Valida dataInicio (camelCase - vem do frontend)
        query('dataInicio')
            .optional() // Torna opcional para permitir data_inicio também
            .isISO8601().withMessage('Data de início deve estar no formato ISO8601 (YYYY-MM-DD).')
            .toDate(),
        // Valida data_inicio (snake_case - formato interno/legado)
        query('data_inicio')
            .optional() // Torna opcional para permitir dataInicio também
            .isISO8601().withMessage('Data de início deve estar no formato ISO8601 (YYYY-MM-DD).')
            .toDate(),
        // Valida dataFim (camelCase - vem do frontend)
        query('dataFim')
            .optional() // Torna opcional para permitir data_fim também
            .isISO8601().withMessage('Data de fim deve estar no formato ISO8601 (YYYY-MM-DD).')
            .toDate(),
        // Valida data_fim (snake_case - formato interno/legado)
        query('data_fim')
            .optional() // Torna opcional para permitir dataFim também
            .isISO8601().withMessage('Data de fim deve estar no formato ISO8601 (YYYY-MM-DD).')
            .toDate()
            .custom((dataFim, { req }) => {
                // Pega o valor de data de início de qualquer fonte (camelCase ou snake_case)
                const dataInicioValue = req.query.dataInicio || req.query.data_inicio;
                const dataFimValue = req.query.dataFim || req.query.data_fim;
                
                // Validação: pelo menos uma das datas de início deve estar presente
                if (!dataInicioValue) {
                    throw new Error('A data de início é obrigatória.');
                }
                
                // Validação: pelo menos uma das datas de fim deve estar presente
                if (!dataFimValue) {
                    throw new Error('A data de fim é obrigatória.');
                }
                
                // Validação: data de fim deve ser >= data de início
                if (dataInicioValue && new Date(dataFimValue) < new Date(dataInicioValue)) {
                    throw new Error('A data de fim deve ser posterior ou igual à data de início.');
                }
                return true;
            })
    ];
};

module.exports = {
    placaValidationRules,
    disponibilidadeValidationRules,
    handleValidationErrors,
};