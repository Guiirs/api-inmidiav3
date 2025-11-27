// @ts-nocheck
import { Router } from 'express';
import * as relatorioController from '../controllers/relatorioController';
import authMiddleware from '../middlewares/authMiddleware';
import { reportRateLimiter } from '../middlewares/rateLimitMiddleware';
import { query } from 'express-validator';
import logger from '../config/logger';

const router = Router();

// Validações
const validateDateRange = [
    query('data_inicio')
        .exists().withMessage('O parâmetro data_inicio é obrigatório.')
        .isDate({ format: 'YYYY-MM-DD' }).withMessage('Data de início inválida. Use o formato YYYY-MM-DD.'),
    query('data_fim')
        .exists().withMessage('O parâmetro data_fim é obrigatório.')
        .isDate({ format: 'YYYY-MM-DD' }).withMessage('Data de fim inválida. Use o formato YYYY-MM-DD.'),
];

const validateOptionalFilters = [
    query('regiao_id')
        .optional()
        .isMongoId().withMessage('ID de região inválido.'),
    query('cliente_id')
        .optional()
        .isMongoId().withMessage('ID de cliente inválido.'),
    query('status')
        .optional()
        .isIn(['ativo', 'inativo', 'concluido', 'cancelado', 'vencido']).withMessage('Status inválido.')
];

// Todas as rotas requerem autenticação e rate limiting
router.use(authMiddleware);
router.use(reportRateLimiter); // 20 req/min por empresa

// GET /api/v1/relatorios/placas-por-regiao
router.get('/placas-por-regiao',
    validateOptionalFilters,
    relatorioController.getPlacasPorRegiao
);

// GET /api/v1/relatorios/dashboard-summary
router.get('/dashboard-summary',
    validateOptionalFilters,
    relatorioController.getDashboardSummary
);

// GET /api/v1/relatorios/ocupacao-por-periodo
router.get('/ocupacao-por-periodo',
    validateDateRange,
    relatorioController.getOcupacaoPorPeriodo
);

// GET /api/v1/relatorios/export/ocupacao-por-periodo
router.get('/export/ocupacao-por-periodo',
    validateDateRange,
    relatorioController.exportOcupacaoPdf
);

logger.debug('[Routes Relatorios] Router exportado.');
logger.info('[Routes Relatorios] Rotas de Relatórios definidas com sucesso.');

export default router;
