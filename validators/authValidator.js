// validators/authValidator.js
const { body, validationResult } = require('express-validator');

// Regras de validação para a rota de registro
const registerValidationRules = () => {
    return [
        body('username').trim().notEmpty().withMessage('O nome de usuário é obrigatório.'),
        body('email').isEmail().withMessage('O email fornecido é inválido.').normalizeEmail(),
        body('password').isLength({ min: 6 }).withMessage('A senha precisa ter no mínimo 6 caracteres.'),
        body('nome').trim().notEmpty().withMessage('O nome é obrigatório.'),
    ];
};

// Regras de validação para a rota de login
const loginValidationRules = () => {
    return [
        body('email').notEmpty().withMessage('O nome de usuário é obrigatório.'),
        body('password').notEmpty().withMessage('A senha é obrigatória.'),
    ];
};

// Middleware que verifica e formata os erros de validação
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
    registerValidationRules,
    loginValidationRules,
    handleValidationErrors,
};