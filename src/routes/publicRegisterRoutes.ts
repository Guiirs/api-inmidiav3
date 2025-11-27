// @ts-nocheck
import { Router } from 'express';
import { registerEmpresaController } from '../controllers/empresaController';
import { registerValidationRules } from '../validators/empresaValidator';
import { handleValidationErrors } from '../validators/authValidator';
import logger from '../config/logger';

const router = Router();

logger.info('[Routes Public] Definindo rotas de Registo Público...');

/**
 * @route   POST /api/empresas/register
 * @desc    Regista uma nova empresa e o seu utilizador admin
 * @access  Public
 */
router.post(
    '/register',
    registerValidationRules,
    handleValidationErrors,
    registerEmpresaController
);

logger.info('[Routes Public] Rota POST /register definida com validação.');

export default router;
