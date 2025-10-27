// routes/placas.js

const express = require('express');
const router = express.Router();
const logger = require('../config/logger'); // Importa o logger para mensagens mais detalhadas

let createPlacaController, updatePlacaController, getAllPlacasController, getPlacaByIdController, deletePlacaController, toggleDisponibilidadeController, getPlacaLocationsController;
let authMiddleware;
let upload;

try {
    // Tenta importar os controllers
    ({
        createPlacaController,
        updatePlacaController,
        getAllPlacasController,
        getPlacaByIdController,
        deletePlacaController,
        toggleDisponibilidadeController,
        getPlacaLocationsController
    } = require('../controllers/placaController')); //
    logger.info('[Routes Placas] Controllers de Placa carregados com sucesso.');
} catch (error) {
    logger.error('[Routes Placas] ERRO CRÍTICO ao carregar placaController:', error);
    // Lança o erro para impedir que a aplicação inicie com rotas quebradas
    throw new Error('Falha ao carregar controllers de Placa.');
}

try {
    // Tenta importar o middleware de autenticação
    authMiddleware = require('../middlewares/authMiddleware'); //
    logger.info('[Routes Placas] Middleware de Autenticação carregado com sucesso.');
} catch (error) {
    logger.error('[Routes Placas] ERRO CRÍTICO ao carregar authMiddleware:', error);
    throw new Error('Falha ao carregar middleware de Autenticação.');
}

try {
    // Tenta importar o middleware de upload
    // A desestruturação é importante aqui
    ({ upload } = require('../middlewares/uploadMiddleware')); //

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

// --- Rotas de Placas ---

// GET /api/placas/locations - Busca todas as localizações (sem paginação, apenas coords)
// Colocar esta rota ANTES de /api/placas/:id para evitar conflito
router.get('/locations', authMiddleware, getPlacaLocationsController);
logger.debug('[Routes Placas] Rota GET /locations definida.');

// GET /api/placas - Busca todas as placas (com filtros e paginação)
router.get('/', authMiddleware, getAllPlacasController);
logger.debug('[Routes Placas] Rota GET / definida.');

// GET /api/placas/:id - Busca uma placa por ID
router.get('/:id', authMiddleware, getPlacaByIdController);
logger.debug('[Routes Placas] Rota GET /:id definida.');

// POST /api/placas - Cria uma nova placa
// Usa o middleware 'upload.single' ANTES do controller
router.post('/', authMiddleware, upload.single('imagem'), createPlacaController);
logger.debug('[Routes Placas] Rota POST / definida.');

// PUT /api/placas/:id - Atualiza uma placa existente
// Usa o middleware 'upload.single' ANTES do controller
router.put('/:id', authMiddleware, upload.single('imagem'), updatePlacaController);
logger.debug('[Routes Placas] Rota PUT /:id definida.');

// DELETE /api/placas/:id - Apaga uma placa
router.delete('/:id', authMiddleware, deletePlacaController);
logger.debug('[Routes Placas] Rota DELETE /:id definida.');

// PATCH /api/placas/:id/disponibilidade - Alterna status de disponibilidade (manutenção)
router.patch('/:id/disponibilidade', authMiddleware, toggleDisponibilidadeController);
logger.debug('[Routes Placas] Rota PATCH /:id/disponibilidade definida.');


logger.info('[Routes Placas] Rotas de Placas definidas com sucesso.');

module.exports = router; // Exporta o router configurado
logger.debug('[Routes Placas] Router exportado.'); // Confirma a exportação