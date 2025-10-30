// routes/aluguelRoutes.js
const express = require('express');
const router = express.Router();
// [MELHORIA] Importa 'param' para validar IDs na URL
const { body, param } = require('express-validator');
const aluguelController = require('../controllers/aluguelController');
const authenticateToken = require('../middlewares/authMiddleware');
// Reutiliza o handler de erros de validação
const { handleValidationErrors } = require('../validators/authValidator'); 
const logger = require('../config/logger');

// Validação para Aluguel (Criar) - Mantida do original
const validateAluguel = [
    body('placa_id')
        .notEmpty().withMessage('ID da placa é obrigatório.')
        .isMongoId().withMessage('ID da placa inválido.'),

    body('cliente_id')
        .notEmpty().withMessage('ID do cliente é obrigatório.')
        .isMongoId().withMessage('ID do cliente inválido.'),

    body('data_inicio')
        .notEmpty().withMessage('Data de início é obrigatória.')
        .isISO8601().withMessage('Data de início inválida (formato YYYY-MM-DD).')
        .toDate(), // Converte para objeto Date

    body('data_fim')
        .notEmpty().withMessage('Data final é obrigatória.')
        .isISO8601().withMessage('Data final inválida (formato YYYY-MM-DD).')
        .toDate()
        .custom((value, { req }) => {
             // Validação customizada
             if (!req.body.data_inicio || value <= req.body.data_inicio) {
                 throw new Error('A data final deve ser posterior à data inicial.');
             }
             return true;
         }),
];

// [MELHORIA] Validação para IDs nos parâmetros da URL
const validateIdParam = [
    param('id').isMongoId().withMessage('O ID do aluguel fornecido é inválido.')
];
const validatePlacaIdParam = [
    param('placaId').isMongoId().withMessage('O ID da placa fornecido é inválido.')
];


logger.info('[Routes Aluguel] Definindo rotas de Alugueis...');

// Aplica o middleware de autenticação a todas as rotas de aluguel
router.use(authenticateToken);
logger.debug('[Routes Aluguel] Middleware de Autenticação aplicado a /alugueis/*.');

// Rota para criar um novo aluguel
// POST /api/v1/alugueis/
router.post(
    '/',
    validateAluguel,        // 1. Valida o body
    handleValidationErrors, // 2. Trata os erros
    aluguelController.createAluguel
);
logger.debug('[Routes Aluguel] Rota POST / definida (Criar Aluguel).');

// Rota para apagar/cancelar um aluguel
// DELETE /api/v1/alugueis/:id
router.delete(
    '/:id',
    validateIdParam,        // 1. [MELHORIA] Valida o ID na URL
    handleValidationErrors, // 2. Trata os erros
    aluguelController.deleteAluguel
);
logger.debug('[Routes Aluguel] Rota DELETE /:id definida (Apagar Aluguel).');

// Rota para listar todos os alugueis de UMA placa
// GET /api/v1/alugueis/placa/:placaId
router.get(
    '/placa/:placaId',
    validatePlacaIdParam,   // 1. [MELHORIA] Valida o ID da placa na URL
    handleValidationErrors, // 2. Trata os erros
    aluguelController.getAlugueisByPlaca
);
logger.debug('[Routes Aluguel] Rota GET /placa/:placaId definida (Listar por Placa).');

logger.info('[Routes Aluguel] Rotas de Alugueis definidas com sucesso.');

// [CORREÇÃO] Exporta o router diretamente
module.exports = router;
logger.debug('[Routes Aluguel] Router exportado.');