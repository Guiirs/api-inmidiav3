// InMidia/backend/validators/empresaValidator.js
const { body, validationResult } = require('express-validator');
// Importa a função de validação de CNPJ
const { validarCNPJ } = require('../utils/validators'); // Ajuste o caminho se necessário

const registerValidationRules = () => {
    return [
        body('nome_empresa').notEmpty().withMessage('O nome da empresa é obrigatório.'),
        // Adiciona a validação customizada para CNPJ
        body('cnpj').notEmpty().withMessage('O CNPJ é obrigatório.')
            .custom(value => {
                if (!validarCNPJ(value)) {
                    throw new Error('O CNPJ fornecido é inválido.');
                }
                // Indica que a validação passou
                return true;
            }),
        body('nome').notEmpty().withMessage('O nome do administrador é obrigatório.'),
        body('sobrenome').notEmpty().withMessage('O sobrenome do administrador é obrigatório.'),
        // Adiciona validação para username
        body('username').trim().isLength({ min: 3 }).withMessage('O nome de utilizador deve ter no mínimo 3 caracteres.'),
        body('email').isEmail().withMessage('Forneça um e-mail válido.'),
        body('password').isLength({ min: 6 }).withMessage('A senha deve ter no mínimo 6 caracteres.'),
    ];
};

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Retorna apenas a primeira mensagem de erro para simplicidade
        const firstError = errors.array({ onlyFirstError: true })[0].msg;
        return res.status(400).json({ message: firstError });
        // Ou, se preferir retornar todos os erros:
        // return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = {
    registerValidationRules,
    handleValidationErrors,
};