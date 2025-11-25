// routes/placas.js
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const { param } = require('express-validator');

// Importa controllers, middlewares e validadores
const {
    createPlacaController,
    updatePlacaController,
    getAllPlacasController,
    getPlacaByIdController,
    deletePlacaController,
    toggleDisponibilidadeController,
    getPlacaLocationsController,
    getPlacasDisponiveisController
} = require('../controllers/placaController');

const authMiddleware = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');
const {
    placaValidationRules,
    disponibilidadeValidationRules,
    handleValidationErrors
} = require('../validators/placaValidator');

logger.info('[Routes Placas] Componentes carregados com sucesso.');


// --- Middleware de Autenticação para TODAS as rotas ---
router.use(authMiddleware);
logger.debug('[Routes Placas] Middleware de Autenticação aplicado a /placas/*.');

// [MELHORIA] Validação para IDs nos parâmetros da URL
const validateIdParam = [
    param('id').isMongoId().withMessage('O ID da placa fornecido é inválido.')
];


logger.info('[Routes Placas] Definindo rotas de Placas...');

// GET /api/v1/placas/locations - Busca todas as localizações (coordenadas)
router.get('/locations', getPlacaLocationsController);
logger.debug('[Routes Placas] Rota GET /locations definida (Buscar Localizações).');

// Middleware para normalizar parâmetros de query (camelCase -> snake_case)
const normalizeQueryParams = (req, res, next) => {
    logger.debug(`[normalizeQueryParams] Query ANTES: ${JSON.stringify(req.query)}`);
    if (req.query.dataInicio) {
        req.query.data_inicio = req.query.dataInicio;
        logger.debug(`[normalizeQueryParams] ✅ Adicionado data_inicio: ${req.query.data_inicio}`);
    }
    if (req.query.dataFim) {
        req.query.data_fim = req.query.dataFim;
        logger.debug(`[normalizeQueryParams] ✅ Adicionado data_fim: ${req.query.data_fim}`);
    }
    logger.debug(`[normalizeQueryParams] Query DEPOIS: ${JSON.stringify(req.query)}`);
    next();
};

// GET /api/v1/placas/disponiveis - Busca placas disponíveis por período
router.get(
    '/disponiveis',
    normalizeQueryParams,
    disponibilidadeValidationRules(),
    handleValidationErrors,
    getPlacasDisponiveisController
);
logger.debug('[Routes Placas] Rota GET /disponiveis definida (Buscar Placas Disponíveis por Período).');
logger.debug('[Routes Placas] Rota GET /disponiveis definida (Buscar Placas Disponíveis).');
// =============================================================================


// GET /api/v1/placas - Busca todas as placas (com filtros e paginação)
router.get('/', getAllPlacasController);
logger.debug('[Routes Placas] Rota GET / definida (Listar Placas).');

// POST /api/v1/placas - Cria uma nova placa (com upload)
router.post(
    '/', 
    upload.single('imagem'),
    placaValidationRules(),     // 1. [MELHORIA] Validação do body
    handleValidationErrors,     // 2. [MELHORIA] Trata os erros de validação
    createPlacaController
);
logger.debug('[Routes Placas] Rota POST / definida (Criar Placa com Upload e Validação).');

// GET /api/v1/placas/:id - Busca uma placa por ID
router.get(
    '/:id', 
    validateIdParam,            // 1. [MELHORIA] Valida o ID na URL
    handleValidationErrors,     // 2. Trata os erros
    getPlacaByIdController
);
logger.debug('[Routes Placas] Rota GET /:id definida (Buscar Placa por ID).');

// PUT /api/v1/placas/:id - Atualiza uma placa existente (com upload)
router.put(
    '/:id', 
    upload.single('imagem'), 
    validateIdParam,            // 1. [MELHORIA] Valida o ID na URL
    placaValidationRules(),     // 2. [MELHORIA] Validação do body
    handleValidationErrors,     // 3. Trata os erros
    updatePlacaController
);
logger.debug('[Routes Placas] Rota PUT /:id definida (Atualizar Placa com Upload e Validação).');

// DELETE /api/v1/placas/:id - Apaga uma placa
router.delete(
    '/:id', 
    validateIdParam,            // 1. [MELHORIA] Valida o ID na URL
    handleValidationErrors,     // 2. Trata os erros
    deletePlacaController
);
logger.debug('[Routes Placas] Rota DELETE /:id definida (Apagar Placa).');

// PATCH /api/v1/placas/:id/disponibilidade - Alterna status de disponibilidade (manutenção)
router.patch(
    '/:id/disponibilidade', 
    validateIdParam,            // 1. [MELHORIA] Valida o ID na URL
    handleValidationErrors,     // 2. Trata os erros
    toggleDisponibilidadeController
);
logger.debug('[Routes Placas] Rota PATCH /:id/disponibilidade definida (Toggle Disponibilidade).');


logger.info('[Routes Placas] Rotas de Placas definidas com sucesso.');

module.exports = router;