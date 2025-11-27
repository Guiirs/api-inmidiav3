import { body, query, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Regras de validação para criar ou atualizar uma placa
export const placaValidationRules: ValidationChain[] = [
    body('numero_placa')
        .trim()
        .notEmpty()
        .withMessage('O número da placa é obrigatório.')
        .isLength({ max: 50 })
        .withMessage('Número da placa muito longo (máx 50 caracteres).')
        .escape(),

    // Campos opcionais, valida se preenchidos
    body('coordenadas')
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/)
        .withMessage('Formato de coordenadas inválido (ex: -3.12, -38.45).')
        .isLength({ max: 100 })
        .withMessage('Coordenadas muito longas (máx 100 caracteres).')
        .escape(),

    body('nomeDaRua')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 255 })
        .withMessage('Nome da rua muito longo (máx 255 caracteres).')
        .escape(),

    body('tamanho')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 50 })
        .withMessage('Tamanho muito longo (máx 50 caracteres).')
        .escape(),

    // Validação da região (chave 'regiao' contendo ObjectId)
    body('regiao')
        .notEmpty()
        .withMessage('A região é obrigatória.')
        .isMongoId()
        .withMessage('ID da região inválido.')
];

// Middleware que verifica e formata os erros de validação
export const handleValidationErrors = (
    req: Request,
    res: Response,
    next: NextFunction
): void | Response => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    // Retorna apenas a primeira mensagem de erro
    const firstError = errors.array({ onlyFirstError: true })[0]?.msg || 'Erro de validação';
    return res.status(400).json({ message: firstError });
};

// Validação para query params de disponibilidade (data_inicio e data_fim)
// Aceita tanto camelCase (dataInicio/dataFim) quanto snake_case (data_inicio/data_fim)
export const disponibilidadeValidationRules: ValidationChain[] = [
    // Valida dataInicio (camelCase - vem do frontend)
    query('dataInicio')
        .optional()
        .isISO8601()
        .withMessage('Data de início deve estar no formato ISO8601 (YYYY-MM-DD).')
        .toDate(),
    // Valida data_inicio (snake_case - formato interno/legado)
    query('data_inicio')
        .optional()
        .isISO8601()
        .withMessage('Data de início deve estar no formato ISO8601 (YYYY-MM-DD).')
        .toDate(),
    // Valida dataFim (camelCase - vem do frontend)
    query('dataFim')
        .optional()
        .isISO8601()
        .withMessage('Data de fim deve estar no formato ISO8601 (YYYY-MM-DD).')
        .toDate(),
    // Valida data_fim (snake_case - formato interno/legado)
    query('data_fim')
        .optional()
        .isISO8601()
        .withMessage('Data de fim deve estar no formato ISO8601 (YYYY-MM-DD).')
        .toDate()
        .custom((_dataFim: Date, { req }: any) => {
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
