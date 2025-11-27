// @ts-nocheck
import { Router } from 'express';
import { body, param } from 'express-validator';
import logger from '../config/logger';
import * as adminController from '../controllers/adminController';
import authenticateToken from '../middlewares/authMiddleware';
import adminAuthMiddleware from '../middlewares/adminAuthMiddleware';
import { handleValidationErrors } from '../validators/authValidator';

const router = Router();

logger.info('[Routes Admin] Definindo rotas de Administração...');

// Validações
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

const validateRoleUpdate = [
    param('id').isMongoId().withMessage('O ID do utilizador fornecido é inválido.'),
    body('role')
        .notEmpty().withMessage("O campo 'role' é obrigatório.")
        .isIn(['user', 'admin']).withMessage("A 'role' fornecida é inválida. Use 'admin' ou 'user'.")
];

const validateIdParam = [
    param('id').isMongoId().withMessage('O ID do utilizador fornecido é inválido.')
];

// Middlewares aplicados a todas as rotas
router.use(authenticateToken);
logger.debug('[Routes Admin] Middleware de Autenticação aplicado a /admin/*.');

router.use(adminAuthMiddleware);
logger.debug('[Routes Admin] Middleware de Admin aplicado a /admin/*.');

// GET /api/v1/admin/users
router.get('/users', adminController.getAllUsers);
logger.debug('[Routes Admin] Rota GET /users definida (Listar Utilizadores).');

// POST /api/v1/admin/users
router.post(
    '/users',
    validateUserCreation,
    handleValidationErrors,
    adminController.createUser
);
logger.debug('[Routes Admin] Rota POST /users definida (Criar Utilizador).');

// PUT /api/v1/admin/users/:id/role
router.put(
    '/users/:id/role',
    validateRoleUpdate,
    handleValidationErrors,
    adminController.updateUserRole
);
logger.debug('[Routes Admin] Rota PUT /users/:id/role definida (Atualizar Role).');

// DELETE /api/v1/admin/users/:id
router.delete(
    '/users/:id',
    validateIdParam,
    handleValidationErrors,
    adminController.deleteUser
);
logger.debug('[Routes Admin] Rota DELETE /users/:id definida (Apagar Utilizador).');

logger.info('[Routes Admin] Rotas de Administração definidas com sucesso.');
logger.debug('[Routes Admin] Router exportado.');

export default router;
