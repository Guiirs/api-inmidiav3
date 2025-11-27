// @ts-nocheck
import { Router } from 'express';
import * as piController from '../controllers/piController';
import authenticateToken from '../middlewares/authMiddleware';
import { piValidationRules, validateIdParam, handleValidationErrors } from '../validators/piValidator';
import logger from '../config/logger';

const router = Router();

logger.info('[Routes PI] Definindo rotas de Propostas Internas (PIs)...');

// Aplica autenticação a todas as rotas
router.use(authenticateToken);

// GET /api/v1/pis - Lista todas as PIs (com filtros)
router.get('/', piController.getAllPIs);

// POST /api/v1/pis - Cria uma nova PI
router.post(
    '/',
    piValidationRules,
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
    piValidationRules,
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

export default router;
