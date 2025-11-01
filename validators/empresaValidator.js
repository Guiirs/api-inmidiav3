// InMidia/backend/validators/empresaValidator.js
const { body } = require('express-validator');
const { validarCNPJ } = require('../utils/validators');

// --- CORREÇÃO AQUI ---
// Importa o handler de erros correto que o resto do seu sistema usa
// (Este handler retorna o objeto { errors: {...} } que o frontend espera)
const { handleValidationErrors } = require('./authValidator');
// ---------------------

/**
 * Regras para REGISTAR uma nova empresa e admin
 * (Mantém o seu código original)
 */
const registerValidationRules = () => {
    return [
        // Empresa
        body('nome_empresa')
            .trim()
            .notEmpty().withMessage('O nome da empresa é obrigatório.')
            .isLength({ max: 150 }).withMessage('Nome da empresa muito longo (máx 150 caracteres).')
            .escape(),

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
            .escape(),

        body('sobrenome')
            .trim()
            .notEmpty().withMessage('O sobrenome do administrador é obrigatório.')
            .isLength({ max: 100 }).withMessage('Sobrenome muito longo (máx 100 caracteres).')
            .escape(),

        body('username') 
            .trim()
            .isLength({ min: 3, max: 50 }).withMessage('O nome de utilizador deve ter entre 3 e 50 caracteres.')
            .escape(),

        body('email')
            .isEmail().withMessage('Forneça um e-mail válido.')
            .normalizeEmail()
            .isLength({ max: 100 }).withMessage('E-mail muito longo (máx 100 caracteres).'),
            
        body('password')
            .isLength({ min: 6 }).withMessage('A senha deve ter no mínimo 6 caracteres.'),
    ];
};


// --- FUNÇÃO NOVA ADICIONADA ---
/**
 * Regras para ATUALIZAR os dados da empresa (Página "Minha Empresa")
 * (Esta era a função que faltava)
 */
const updateEmpresaRules = () => {
    return [
        body('nome')
            .optional()
            .trim()
            .notEmpty().withMessage('O nome da empresa não pode ficar vazio.')
            .escape(),
        
        body('cnpj')
            .optional()
            .trim()
            .notEmpty().withMessage('O CNPJ não pode ficar vazio.'),
        
        // Validações para os campos de endereço do PDF
        body('endereco')
            .optional()
            .trim()
            .escape(),
        
        body('bairro')
            .optional()
            .trim()
            .escape(),
        
        body('cidade')
            .optional()
            .trim()
            .escape(),
        
        body('telefone')
            .optional()
            .trim()
            .escape()
    ];
};
// ------------------------------


// Não precisamos redefinir 'handleValidationErrors', pois importámos o correto.

module.exports = {
    registerValidationRules, // Usado por authRoutes.js
    updateEmpresaRules,     // Usado por empresaRoutes.js (CORRIGE O ERRO)
    handleValidationErrors, // Usado por ambas as rotas (CORRIGE O ERRO)
};