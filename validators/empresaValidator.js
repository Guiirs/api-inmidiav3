// InMidia/backend/validators/empresaValidator.js
const { body, validationResult } = require('express-validator');
const { validarCNPJ } = require('../utils/validators');

const registerValidationRules = () => {
    return [
        // Empresa
        body('nome_empresa')
            .trim() // Keep trim
            .notEmpty().withMessage('O nome da empresa é obrigatório.')
            .isLength({ max: 150 }).withMessage('Nome da empresa muito longo (máx 150 caracteres).')
            .escape(), // <-- Add escape

        body('cnpj')
            .notEmpty().withMessage('O CNPJ é obrigatório.')
            .custom(value => {
                if (!validarCNPJ(value)) { // Usa a função de validação de utils
                    throw new Error('O CNPJ fornecido é inválido.');
                }
                return true;
            }),

        // Admin User
        body('nome')
            .trim()
            .notEmpty().withMessage('O nome do administrador é obrigatório.')
            .isLength({ max: 100 }).withMessage('Nome muito longo (máx 100 caracteres).')
            .escape(), // <-- Add escape

        body('sobrenome')
            .trim()
            .notEmpty().withMessage('O sobrenome do administrador é obrigatório.')
            .isLength({ max: 100 }).withMessage('Sobrenome muito longo (máx 100 caracteres).')
            .escape(), // <-- Add escape

        body('username') // Username might allow specific characters, escape cautiously or validate stricter
            .trim()
            .isLength({ min: 3, max: 50 }).withMessage('O nome de utilizador deve ter entre 3 e 50 caracteres.')
            .escape(), // <-- Added escape (consider if allowed characters conflict)

        body('email') // normalizeEmail usually handles email-specific chars well
            .isEmail().withMessage('Forneça um e-mail válido.')
            .normalizeEmail()
            .isLength({ max: 100 }).withMessage('E-mail muito longo (máx 100 caracteres).'),
            // No escape needed after normalizeEmail generally

        body('password') // Passwords should NOT be escaped
            .isLength({ min: 6 }).withMessage('A senha deve ter no mínimo 6 caracteres.'),
    ];
};

// handleValidationErrors remains the same
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array({ onlyFirstError: true })[0].msg;
        return res.status(400).json({ message: firstError });
    }
    next();
};

module.exports = {
    registerValidationRules,
    handleValidationErrors,
};