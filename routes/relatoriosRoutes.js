// routes/relatoriosRoutes.js
const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorioController');
const authMiddleware = require('../middlewares/authMiddleware');
const { reportRateLimiter } = require('../middlewares/rateLimitMiddleware');
const { query } = require('express-validator');
const logger = require('../config/logger');

// Middleware para validar se as datas de início e fim estão presentes e no formato correto
const validateDateRange = [
    query('data_inicio')
        .exists().withMessage('O parâmetro data_inicio é obrigatório.')
        .isDate({ format: 'YYYY-MM-DD' }).withMessage('Data de início inválida. Use o formato YYYY-MM-DD.'),
    query('data_fim')
        .exists().withMessage('O parâmetro data_fim é obrigatório.')
        .isDate({ format: 'YYYY-MM-DD' }).withMessage('Data de fim inválida. Use o formato YYYY-MM-DD.'),
];

// Validação para query params opcionais (filtros de relatórios)
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

// Todas as rotas de relatório requerem autenticação e rate limiting
router.use(authMiddleware);
router.use(reportRateLimiter); // 20 req/min por empresa

// 1. Rota para Relatório de Placas por Região
// GET /api/v1/relatorios/placas-por-regiao?regiao_id=xxx (opcional)
router.get('/placas-por-regiao', 
    validateOptionalFilters,
    relatorioController.getPlacasPorRegiao
);

// 2. Rota para Resumo do Dashboard
// GET /api/v1/relatorios/dashboard-summary
router.get('/dashboard-summary', 
    validateOptionalFilters,
    relatorioController.getDashboardSummary
);

// 3. Rota para Ocupação por Período (Retorna JSON)
// GET /api/v1/relatorios/ocupacao-por-periodo?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD
router.get('/ocupacao-por-periodo', 
    validateDateRange, // Aplica a validação das datas
    relatorioController.getOcupacaoPorPeriodo
);

// 4. [NOVA ROTA] Rota para Exportação de Ocupação por Período em PDF
// GET /api/v1/relatorios/export/ocupacao-por-periodo?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD
// Nota: Use um prefixo como '/export/' para diferenciar a resposta (JSON vs. PDF)
router.get('/export/ocupacao-por-periodo', 
    validateDateRange, // Aplica a mesma validação das datas
    relatorioController.exportOcupacaoPdf // Chama o novo método do controller
);

module.exports = router;
logger.debug('[Routes Relatorios] Router exportado.');
logger.info('[Routes Relatorios] Rotas de Relatórios definidas com sucesso.');