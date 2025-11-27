// @ts-nocheck
import { Router } from 'express';
import * as aluguelController from '../controllers/aluguelController';
import authenticateToken from '../middlewares/authMiddleware';
import * as aluguelValidator from '../validators/aluguelValidator';
import { handleValidationErrors } from '../validators/authValidator';
import logger from '../config/logger';

const router = Router();

logger.info('[Routes Aluguel] Definindo rotas de Alugueis...');

// Aplica autenticação a todas as rotas
router.use(authenticateToken);
logger.debug('[Routes Aluguel] Middleware de Autenticação aplicado a /alugueis/*.');

// POST /api/v1/alugueis/
router.post(
    '/',
    authenticateToken,
    aluguelValidator.validateAluguel,
    handleValidationErrors,
    aluguelValidator.validateBiWeekAlignment,
    aluguelController.createAluguel
);
logger.debug('[Routes Aluguel] Rota POST / definida (Criar Aluguel).');

// DELETE /api/v1/alugueis/:id
router.delete(
    '/:id',
    authenticateToken,
    aluguelValidator.validateIdParam,
    handleValidationErrors,
    aluguelController.deleteAluguel
);
logger.debug('[Routes Aluguel] Rota DELETE /:id definida (Apagar Aluguel).');

// GET /api/v1/alugueis/placa/:placaId
router.get(
    '/placa/:placaId',
    authenticateToken,
    aluguelValidator.validatePlacaIdParam,
    handleValidationErrors,
    aluguelController.getAlugueisByPlaca
);
logger.debug('[Routes Aluguel] Rota GET /placa/:placaId definida (Listar por Placa).');

// GET /api/v1/alugueis/bi-week/:biWeekId
router.get(
    '/bi-week/:biWeekId',
    authenticateToken,
    aluguelController.getAlugueisByBiWeek
);
logger.debug('[Routes Aluguel] Rota GET /bi-week/:biWeekId definida (Listar por Bi-Semana).');

// GET /api/v1/alugueis/bi-week/:biWeekId/disponiveis
router.get(
    '/bi-week/:biWeekId/disponiveis',
    authenticateToken,
    aluguelController.getPlacasDisponiveisByBiWeek
);
logger.debug('[Routes Aluguel] Rota GET /bi-week/:biWeekId/disponiveis definida (Placas Disponíveis).');

// GET /api/v1/alugueis/bi-week/:biWeekId/relatorio
router.get(
    '/bi-week/:biWeekId/relatorio',
    authenticateToken,
    aluguelController.getRelatorioOcupacaoBiWeek
);
logger.debug('[Routes Aluguel] Rota GET /bi-week/:biWeekId/relatorio definida (Relatório de Ocupação).');

logger.info('[Routes Aluguel] Rotas de Alugueis definidas com sucesso.');
logger.debug('[Routes Aluguel] Router exportado.');

export default router;
