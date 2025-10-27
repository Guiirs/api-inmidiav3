// routes/placas.js

const express = require('express');
const router = express.Router();
const logger = require('../config/logger'); // Importa o logger para mensagens mais detalhadas

let createPlacaController, updatePlacaController, getAllPlacasController, getPlacaByIdController, deletePlacaController, toggleDisponibilidadeController, getPlacaLocationsController;
let authMiddleware;
let upload;

// --- 1. Verificação e Carregamento de Controladores (Mantido robusto) ---
try {
    ({
        createPlacaController,
        updatePlacaController,
        getAllPlacasController,
        getPlacaByIdController,
        deletePlacaController,
        toggleDisponibilidadeController,
        getPlacaLocationsController
    } = require('../controllers/placaController'));
    // Verifica se as funções estão disponíveis após desestruturação (exemplo: uma delas)
     if (typeof getAllPlacasController !== 'function') {
         logger.error('[Routes Placas] ERRO CRÍTICO: Controllers de Placa não são funções válidas.');
         throw new Error('Falha ao carregar controllers de Placa (Função ausente).');
     }
    logger.info('[Routes Placas] Controllers de Placa carregados com sucesso.');
} catch (error) {
    logger.error('[Routes Placas] ERRO CRÍTICO ao carregar placaController:', error);
    throw new Error('Falha ao carregar controllers de Placa.');
}

// --- 2. Verificação e Carregamento de Middlewares (Mantido robusto) ---
try {
    authMiddleware = require('../middlewares/authMiddleware');
    logger.info('[Routes Placas] Middleware de Autenticação carregado com sucesso.');
} catch (error) {
    logger.error('[Routes Placas] ERRO CRÍTICO ao carregar authMiddleware:', error);
    throw new Error('Falha ao carregar middleware de Autenticação.');
}

try {
    ({ upload } = require('../middlewares/uploadMiddleware'));
    // Verifica se 'upload' foi realmente importado como um objeto/função esperado
    if (!upload || typeof upload.single !== 'function') {
        logger.error('[Routes Placas] ERRO CRÍTICO: Objeto "upload" importado de uploadMiddleware é inválido ou não possui o método "single".');
        throw new Error('Falha ao carregar ou configurar o middleware de Upload.');
    }
    logger.info('[Routes Placas] Middleware de Upload carregado com sucesso.');
} catch (error) {
    logger.error('[Routes Placas] ERRO CRÍTICO ao carregar ou verificar uploadMiddleware:', error);
    throw new Error('Falha ao carregar middleware de Upload.');
}


logger.info('[Routes Placas] Definindo rotas de Placas...');

// --- Rotas de Placas (TODAS PROTEGIDAS POR authMiddleware) ---

// GET /api/placas/locations - Busca todas as localizações (coordenadas)
router.get('/locations', authMiddleware, getPlacaLocationsController);
logger.debug('[Routes Placas] Rota GET /locations definida (Buscar Localizações).');

// GET /api/placas - Busca todas as placas (com filtros e paginação)
router.get('/', authMiddleware, getAllPlacasController);
logger.debug('[Routes Placas] Rota GET / definida (Listar Placas).');

// GET /api/placas/:id - Busca uma placa por ID
router.get('/:id', authMiddleware, getPlacaByIdController);
logger.debug('[Routes Placas] Rota GET /:id definida (Buscar Placa por ID).');

// POST /api/placas - Cria uma nova placa (com upload)
// Usa o middleware 'upload.single' ANTES do controller
router.post('/', authMiddleware, upload.single('imagem'), createPlacaController);
logger.debug('[Routes Placas] Rota POST / definida (Criar Placa com Upload).');

// PUT /api/placas/:id - Atualiza uma placa existente (com upload)
// Usa o middleware 'upload.single' ANTES do controller
router.put('/:id', authMiddleware, upload.single('imagem'), updatePlacaController);
logger.debug('[Routes Placas] Rota PUT /:id definida (Atualizar Placa com Upload).');

// DELETE /api/placas/:id - Apaga uma placa
router.delete('/:id', authMiddleware, deletePlacaController);
logger.debug('[Routes Placas] Rota DELETE /:id definida (Apagar Placa).');

// PATCH /api/placas/:id/disponibilidade - Alterna status de disponibilidade (manutenção)
router.patch('/:id/disponibilidade', authMiddleware, toggleDisponibilidadeController);
logger.debug('[Routes Placas] Rota PATCH /:id/disponibilidade definida (Toggle Disponibilidade).');


logger.info('[Routes Placas] Rotas de Placas definidas com sucesso.');

module.exports = router; // Exporta o router configurado