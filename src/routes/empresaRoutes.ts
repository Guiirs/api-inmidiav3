// @ts-nocheck
import { Router } from 'express';
import * as empresaController from '../controllers/empresaController';
import authMiddleware from '../middlewares/authMiddleware';
import logger from '../config/logger';
import {
    updateEmpresaRules,
    handleValidationErrors,
} from '../validators/empresaValidator';

const router = Router();

// Verificação de segurança
if (!updateEmpresaRules || !handleValidationErrors) {
    logger.error('[Routes Empresa] ERRO CRÍTICO: Validação não exportada corretamente.');
    logger.error('[Routes Empresa] ERRO CRÍTICO ao carregar empresaValidator: Validação de Empresa incompleta.');
    throw new Error('Falha ao carregar validação de Empresa.');
}

// Rota para BUSCAR os detalhes da empresa (Nome, Endereço, etc.)
router.get(
    '/details',
    authMiddleware,
    empresaController.getEmpresaDetails
);

// Rota para ATUALIZAR os detalhes da empresa
router.put(
    '/details',
    authMiddleware,
    updateEmpresaRules,
    handleValidationErrors,
    empresaController.updateEmpresaDetails
);

export default router;
