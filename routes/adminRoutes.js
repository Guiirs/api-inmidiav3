// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
// [MELHORIA] Importa validadores de 'body' e 'param'
const { body, param } = require('express-validator');

// Importa controladores e middlewares
const adminController = require('../controllers/adminController');
const authenticateToken = require('../middlewares/authMiddleware');
const adminAuthMiddleware = require('../middlewares/adminAuthMiddleware');
// [MELHORIA] Reutiliza o handler de erros de validação
const { handleValidationErrors } = require('../validators/authValidator');

logger.info('[Routes Admin] Definindo rotas de Administração...');

// [MELHORIA] Define regras de validação para a criação de utilizador
const validateUserCreation = [
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
    body('nome')
        .trim()
        .notEmpty().withMessage('O nome é obrigatório.')
        .isLength({ max: 100 }).withMessage('Nome muito longo (máx 100 caracteres).')
        .escape(),
    body('sobrenome')
        .trim()
        .notEmpty().withMessage('O sobrenome é obrigatório.')
        .isLength({ max: 100 }).withMessage('Sobrenome muito longo (máx 100 caracteres).')
        .escape(),
    body('role')
        .optional()
        .isIn(['user', 'admin']).withMessage("A 'role' fornecida é inválida. Use 'admin' ou 'user'.")
];

// [MELHORIA] Define regras de validação para a atualização de role
const validateRoleUpdate = [
    param('id').isMongoId().withMessage('O ID do utilizador fornecido é inválido.'),
    body('role')
        .notEmpty().withMessage("O campo 'role' é obrigatório.")
        .isIn(['user', 'admin']).withMessage("A 'role' fornecida é inválida. Use 'admin' ou 'user'.")
];

// [MELHORIA] Define regras de validação para o ID
const validateIdParam = [
    param('id').isMongoId().withMessage('O ID do utilizador fornecido é inválido.')
];


// --- Middlewares Aplicados a Todas as Rotas /admin ---

// Aplica o middleware de autenticação (verifica o token)
router.use(authenticateToken);
logger.debug('[Routes Admin] Middleware de Autenticação aplicado a /admin/*.');

// Aplica o middleware de autorização (verifica a role 'admin')
router.use(adminAuthMiddleware);
logger.debug('[Routes Admin] Middleware de Admin aplicado a /admin/*.');


// --- Rotas ---

// GET /api/v1/admin/users
router.get('/users', adminController.getAllUsers);
logger.debug('[Routes Admin] Rota GET /users definida (Listar Utilizadores).');

// POST /api/v1/admin/users
router.post(
    '/users',
    validateUserCreation, // 1. Valida o body
    handleValidationErrors, // 2. Trata os erros de validação
    adminController.createUser // 3. Chama o controller
);
logger.debug('[Routes Admin] Rota POST /users definida (Criar Utilizador).');

// PUT /api/v1/admin/users/:id/role
router.put(
    '/users/:id/role',
    validateRoleUpdate, // 1. Valida o ID do parâmetro e o body
    handleValidationErrors, // 2. Trata os erros
    adminController.updateUserRole
);
logger.debug('[Routes Admin] Rota PUT /users/:id/role definida (Atualizar Role).');

// DELETE /api/v1/admin/users/:id
router.delete(
    '/users/:id',
    validateIdParam, // 1. Valida o ID do parâmetro
    handleValidationErrors, // 2. Trata os erros
    adminController.deleteUser
);
logger.debug('[Routes Admin] Rota DELETE /users/:id definida (Apagar Utilizador).');

logger.info('[Routes Admin] Rotas de Administração definidas com sucesso.');

// [CORREÇÃO] Exporta o router diretamente em vez de uma função
module.exports = router;
    logger.debug('[Routes Admin] Router exportado.');