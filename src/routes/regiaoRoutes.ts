// @ts-nocheck
import { Router } from 'express';
import { body, param } from 'express-validator';
import logger from '../config/logger';
import * as regiaoController from '../controllers/regiaoController';
import authenticateToken from '../middlewares/authMiddleware';
import { handleValidationErrors } from '../validators/authValidator';

const router = Router();

// Verificação de componentes
if (typeof regiaoController.getAllRegioes !== 'function' || typeof authenticateToken !== 'function') {
    logger.error('[Routes Regiao] ERRO CRÍTICO: Controllers ou Middleware de Regiao ausentes.');
    throw new Error('Componentes de Região incompletos.');
}
logger.info('[Routes Regiao] Componentes carregados com sucesso.');

// Validações
const validateRegiaoBody = [
    body('nome')
        .trim()
        .notEmpty().withMessage('O nome da região é obrigatório.')
        .isLength({ max: 100 }).withMessage('Nome da região muito longo (máx 100 caracteres).')
        .escape()
];

const validateIdParam = [
    param('id').isMongoId().withMessage('O ID da região fornecido é inválido.')
];

logger.info('[Routes Regiao] Definindo rotas de Regiões...');

// Aplica autenticação a todas as rotas
router.use(authenticateToken);
logger.debug('[Routes Regiao] Middleware de Autenticação aplicado a /regioes/*.');

// GET /api/v1/regioes - Lista todas as regiões
router.get('/', regiaoController.getAllRegioes);
logger.debug('[Routes Regiao] Rota GET / definida (Listar Regiões).');

// POST /api/v1/regioes - Cria uma nova região
router.post(
    '/',
    validateRegiaoBody,
    handleValidationErrors,
    regiaoController.createRegiao
);
logger.debug('[Routes Regiao] Rota POST / definida (Criar Região).');

// PUT /api/v1/regioes/:id - Atualiza o nome de uma região
router.put(
    '/:id',
    validateIdParam,
    validateRegiaoBody,
    handleValidationErrors,
    regiaoController.updateRegiao
);
logger.debug('[Routes Regiao] Rota PUT /:id definida (Atualizar Região).');

// DELETE /api/v1/regioes/:id - Apaga uma região
router.delete(
    '/:id',
    validateIdParam,
    handleValidationErrors,
    regiaoController.deleteRegiao
);
logger.debug('[Routes Regiao] Rota DELETE /:id definida (Apagar Região).');

logger.info('[Routes Regiao] Rotas de Regiões definidas com sucesso.');
logger.debug('[Routes Regiao] Router exportado.');

export default router;
