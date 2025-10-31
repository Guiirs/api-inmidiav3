// routes/piRoutes.js
const express = require('express');
const router = express.Router();
const piController = require('../controllers/piController');
const authenticateToken = require('../middlewares/authMiddleware');
const { piValidationRules, validateIdParam, handleValidationErrors } = require('../validators/piValidator');
const logger = require('../config/logger');

logger.info('[Routes PI] Definindo rotas de Propostas Internas (PIs)...');

// Aplica autenticação a todas as rotas
router.use(authenticateToken);

// GET /api/v1/pis - Lista todas as PIs (com filtros)
router.get('/', piController.getAllPIs);

// POST /api/v1/pis - Cria uma nova PI
router.post(
    '/',
    piValidationRules(),
    handleValidationErrors,
    piController.createPI
);

// GET /api/v1/pis/:id - Busca uma PI específica
router.get(
    '/:id',
    validateIdParam,
    handleValidationErrors,
    piController.getPIById
);

// PUT /api/v1/pis/:id - Atualiza uma PI
router.put(
    '/:id',
    validateIdParam,
    piValidationRules(),
    handleValidationErrors,
    piController.updatePI
);

// DELETE /api/v1/pis/:id - Apaga uma PI
router.delete(
    '/:id',
    validateIdParam,
    handleValidationErrors,
    piController.deletePI
);

// GET /api/v1/pis/:id/download - Gera o PDF da PI
router.get(
    '/:id/download',
    validateIdParam,
    handleValidationErrors,
    piController.downloadPI_PDF
);

logger.info('[Routes PI] Rotas de PIs definidas com sucesso.');
module.exports = router;