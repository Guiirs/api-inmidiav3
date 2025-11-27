// @ts-nocheck
import { Router } from 'express';
import * as contratoController from '../controllers/contratoController';
import authenticateToken from '../middlewares/authMiddleware';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../validators/authValidator';
import logger from '../config/logger';

const router = Router();

logger.info('[Routes Contrato] Definindo rotas de Contratos...');

// Aplica autenticação a todas as rotas
router.use(authenticateToken);

// Validações
const validateIdParam = [
    param('id').isMongoId().withMessage('O ID do contrato fornecido é inválido.')
];

const validateContratoCreateBody = [
    body('piId')
        .notEmpty().withMessage('O ID da PI (Proposta Interna) é obrigatório.')
        .isMongoId().withMessage('O ID da PI é inválido.')
];

const validateContratoUpdateBody = [
    body('status')
        .optional()
        .isIn(['rascunho', 'ativo', 'concluido', 'cancelado'])
        .withMessage("O status fornecido é inválido. Valores permitidos: 'rascunho', 'ativo', 'concluido', 'cancelado'.")
];

// POST /api/v1/contratos - Cria um contrato a partir de uma PI
router.post(
    '/',
    validateContratoCreateBody,
    handleValidationErrors,
    contratoController.createContrato
);

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
    validateContratoUpdateBody,
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

// GET /api/v1/contratos/:id/download - Gera o PDF do contrato
router.get(
    '/:id/download',
    validateIdParam,
    handleValidationErrors,
    contratoController.downloadContrato_PDF
);

// GET /api/v1/contratos/:id/excel - Gera o EXCEL do contrato
router.get(
    '/:id/excel',
    validateIdParam,
    handleValidationErrors,
    contratoController.downloadContrato_Excel
);

// GET /api/v1/contratos/:id/pdf-excel - Gera o PDF baseado no Excel
router.get(
    '/:id/pdf-excel',
    validateIdParam,
    handleValidationErrors,
    contratoController.downloadContrato_PDF_FromExcel
);

logger.info('[Routes Contrato] Rotas de Contratos definidas com sucesso.');

export default router;
