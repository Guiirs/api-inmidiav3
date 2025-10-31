// routes/contratoRoutes.js
const express = require('express');
const router = express.Router();
const contratoController = require('../controllers/contratoController');
const authenticateToken = require('../middlewares/authMiddleware');
const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../validators/authValidator');
const logger = require('../config/logger');

logger.info('[Routes Contrato] Definindo rotas de Contratos...');

// Aplica autenticação a todas as rotas
router.use(authenticateToken);

// --- Validações ---
const validateIdParam = [
    param('id').isMongoId().withMessage('O ID do contrato fornecido é inválido.')
];

const validateContratoCreateBody = [
    body('piId')
        .notEmpty().withMessage('O ID da PI (Proposta Interna) é obrigatório.')
        .isMongoId().withMessage('O ID da PI é inválido.')
];

// Validação para o body do UPDATE (ex: mudança de status)
const validateContratoUpdateBody = [
    body('status')
        .optional() // Permite atualização de outros campos sem mexer no status
        .isIn(['rascunho', 'ativo', 'concluido', 'cancelado'])
        .withMessage("O status fornecido é inválido. Valores permitidos: 'rascunho', 'ativo', 'concluido', 'cancelado'.")
];
// --- Fim Validações ---


// POST /api/v1/contratos - Cria um contrato a partir de uma PI
router.post(
    '/',
    validateContratoCreateBody,
    handleValidationErrors,
    contratoController.createContrato
);

// --- ROTAS CRUD ADICIONADAS ---

// GET /api/v1/contratos - Lista todos os contratos (com filtros)
router.get(
    '/',
    contratoController.getAllContratos
);

// GET /api/v1/contratos/:id - Busca um contrato específico
router.get(
    '/:id',
    validateIdParam,
    handleValidationErrors,
    contratoController.getContratoById
);

// PUT /api/v1/contratos/:id - Atualiza um contrato (ex: status)
router.put(
    '/:id',
    validateIdParam,
    validateContratoUpdateBody, // Adiciona validação para o corpo do update
    handleValidationErrors,
    contratoController.updateContrato
);

// DELETE /api/v1/contratos/:id - Apaga um contrato
router.delete(
    '/:id',
    validateIdParam,
    handleValidationErrors,
    contratoController.deleteContrato
);

// --- FIM ROTAS CRUD ---


// GET /api/v1/contratos/:id/download - Gera o PDF do contrato
router.get(
    '/:id/download',
    validateIdParam,
    handleValidationErrors,
    contratoController.downloadContrato_PDF
);

logger.info('[Routes Contrato] Rotas de Contratos definidas com sucesso.');
module.exports = router;