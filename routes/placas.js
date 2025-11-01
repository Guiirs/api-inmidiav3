// routes/placas.js
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
// [MELHORIA] Importa validadores de body e param
const { param } = require('express-validator');

// Importa controllers e middlewares
let createPlacaController, updatePlacaController, getAllPlacasController, getPlacaByIdController, deletePlacaController, toggleDisponibilidadeController, getPlacaLocationsController, 
    getPlacasDisponiveisController; // <--- 1. IMPORTAR NOVO CONTROLLER
let authMiddleware;
let upload;
let placaValidationRules, handleValidationErrors, 
    disponibilidadeValidationRules; // <--- 2. IMPORTAR NOVO VALIDADOR

try {
    // Importa as regras de validação (o novo validador 'disponibilidadeValidationRules' será criado depois)
    ({ placaValidationRules, handleValidationErrors, disponibilidadeValidationRules } = require('../validators/placaValidator'));
    
    // Importa os controllers
    ({
        createPlacaController, updatePlacaController, getAllPlacasController, getPlacaByIdController, deletePlacaController,
        toggleDisponibilidadeController, getPlacaLocationsController,
        getPlacasDisponiveisController // <--- 3. ASSOCIAR O CONTROLLER IMPORTADO
    } = require('../controllers/placaController'));

    authMiddleware = require('../middlewares/authMiddleware');
    ({ upload } = require('../middlewares/uploadMiddleware'));
    
    // Verificações de integridade (mantidas)
     if (typeof getAllPlacasController !== 'function' || !upload || typeof upload.single !== 'function') {
         logger.error('[Routes Placas] ERRO CRÍTICO: Controllers ou Middleware de Placa ausentes/inválidos.');
         throw new Error('Falha ao carregar componentes de Placa.');
     }
    logger.info('[Routes Placas] Componentes carregados com sucesso.');
} catch (error) {
    logger.error('[Routes Placas] ERRO CRÍTICO ao carregar dependências:', error);
    // Permite que o app inicie, mas a rota falhará se o controller não carregar
    if (error.message.includes('disponibilidadeValidationRules') || error.message.includes('getPlacasDisponiveisController')) {
        logger.warn('[Routes Placas] Aviso: Controller/Validador de Placas Disponíveis ainda não implementado.');
    } else {
        throw new Error('Falha ao carregar dependências de Placa.');
    }
}


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


// =============================================================================
// == NOVA ROTA ADICIONADA AQUI ==
// =============================================================================
// GET /api/v1/placas/disponiveis - Busca placas disponíveis por período
router.get(
    '/disponiveis',
    // Adicionaremos a validação em um passo futuro no 'placaValidator.js'
    // disponibilidadeValidationRules(), // <--- Descomente quando o validador existir
    // handleValidationErrors,
    (req, res, next) => { // Workaround temporário se o controller não carregar
        if (typeof getPlacasDisponiveisController === 'function') {
            return getPlacasDisponiveisController(req, res, next);
        }
        logger.error('[Routes Placas] getPlacasDisponiveisController não foi carregado.');
        next(new Error('Controller de placas disponíveis não está pronto.'));
    }
);
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