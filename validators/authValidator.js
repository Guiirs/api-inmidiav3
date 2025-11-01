// validators/authValidator.js
const { body, validationResult } = require('express-validator');
const AppError = require('../utils/AppError'); // <<< 1. Importar o AppError

// Regras de validação para a rota de registro
const registerValidationRules = () => {
    return [
        // Mantém as mesmas regras com body()...
        body('email').isEmail().withMessage('O email fornecido é inválido.').normalizeEmail(),
        body('password').isLength({ min: 6 }).withMessage('A senha precisa ter no mínimo 6 caracteres.'),
        // Adicione outras regras se necessário (username, nome, etc.)
        body('username').trim().notEmpty().withMessage('O nome de utilizador é obrigatório.'),
        body('nome').trim().notEmpty().withMessage('O nome é obrigatório.'),
        // ... (adicione validações para outros campos como sobrenome, nome_empresa, cnpj se este validador for usado no registro da empresa)
    ];
};

// Regras de validação para a rota de login
const loginValidationRules = () => {
    return [
        // Mantém as mesmas regras com body()...
        body('email').isEmail().withMessage('O email fornecido é inválido.').normalizeEmail(), // Ou use 'username' se o login for por username
        body('password').notEmpty().withMessage('A senha é obrigatória.'),
    ];
};

// Middleware que verifica e formata os erros de validação
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next(); // Sem erros, continua para o próximo middleware/controller
    }

    // ---> 2. Estrutura os erros <---
    const extractedErrors = {};
    // Mapeia os erros para um objeto { fieldName: errorMessage }
    errors.array({ onlyFirstError: true }).forEach(err => {
        // Usa err.path em vez de err.param para compatibilidade com versões mais recentes ou diferentes usos
        // (às vezes pode ser nested, mas para a maioria dos casos simples 'path' funciona)
        if (!extractedErrors[err.path]) {
            extractedErrors[err.path] = err.msg;
        }
    });

    // ---> 3. Cria e passa o AppError estruturado <---
    // Cria um erro operacional com status 400 (Bad Request)
    const error = new AppError('Erro de validação nos dados enviados.', 400);
    // Adiciona o objeto de erros detalhados à instância do erro
    error.validationErrors = extractedErrors;

    // Passa o erro estruturado para o próximo middleware de erro (errorHandler.js)
    return next(error);

    /* Código antigo comentado:
    const extractedErrors = [];
    errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

    return res.status(400).json({
        errors: extractedErrors,
    });
    */
};

module.exports = {
    registerValidationRules,
    loginValidationRules,
    handleValidationErrors,
};