// routes/contratoRoutes.js
const express = require('express');
const router = express.Router();
const contratoController = require('../controllers/contratoController');
const authenticateToken = require('../middlewares/authMiddleware');
const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../validators/authValidator');
const logger = require('../config/logger');

logger.info('[Routes Contrato] Definindo rotas de Contratos...');

router.use(authenticateToken);

const validateIdParam = [
    param('id').isMongoId().withMessage('O ID do contrato fornecido é inválido.')
];
const validateContratoBody = [
    body('piId')
        .notEmpty().withMessage('O ID da PI (Proposta Interna) é obrigatório.')
        .isMongoId().withMessage('O ID da PI é inválido.')
];

// POST /api/v1/contratos - Cria um contrato a partir de uma PI
router.post(
    '/',
    validateContratoBody,
    handleValidationErrors,
    contratoController.createContrato
);

// GET /api/v1/contratos/:id/download - Gera o PDF do contrato
router.get(
    '/:id/download',
    validateIdParam,
    handleValidationErrors,
    contratoController.downloadContrato_PDF
);

// (Adicione outras rotas de Contrato (GET, LIST, DELETE) se necessário)

logger.info('[Routes Contrato] Rotas de Contratos definidas com sucesso.');
module.exports = router;