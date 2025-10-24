// validators/authValidator.js
const { body, validationResult } = require('express-validator');

// Regras de validação para a rota de login
const loginValidationRules = () => {
    return [
        // Login agora usa email
        body('email')
            .trim() // Remove espaços
            .notEmpty().withMessage('O e-mail é obrigatório.')
            .isEmail().withMessage('Formato de e-mail inválido.')
            .normalizeEmail(), // Normaliza (já sanitiza para formato de email)

        body('password') // Senhas NÃO devem ser escapadas
            .notEmpty().withMessage('A senha é obrigatória.'),
    ];
};

// Middleware que verifica e formata os erros de validação (inalterado)
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    // Retorna a primeira mensagem de erro
    const firstError = errors.array({ onlyFirstError: true })[0].msg;
    return res.status(400).json({ message: firstError });
};

module.exports = {
    loginValidationRules,
    handleValidationErrors, // Exporta o handler para ser reutilizado
};