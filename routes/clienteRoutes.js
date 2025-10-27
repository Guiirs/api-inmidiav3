// routes/clienteRoutes.js (CORRIGIDO E ROBUSTO)

const express = require('express');
const router = express.Router();
const logger = require('../config/logger'); // Adiciona logger

// 1. Importa as funções específicas do controller (com verificação de existência)
let createClienteController, updateClienteController, getAllClientesController, getClienteByIdController, deleteClienteController;
try {
    ({
        createClienteController,
        updateClienteController,
        getAllClientesController,
        getClienteByIdController,
        deleteClienteController
    } = require('../controllers/clienteController')); //
    // Verifica se pelo menos uma função importante foi importada
    if (typeof getAllClientesController !== 'function') {
        logger.error('[Routes Clientes] ERRO CRÍTICO: Controllers de Cliente não são funções válidas.');
        throw new Error('Falha ao carregar controllers de Cliente.');
    }
    logger.info('[Routes Clientes] Controllers de Cliente carregados com sucesso.');
} catch (error) {
    logger.error('[Routes Clientes] ERRO CRÍTICO ao carregar clienteController:', error);
    throw new Error('Falha ao carregar controllers de Cliente.');
}

// 2. Importa middlewares
let authenticateToken;
try {
    authenticateToken = require('../middlewares/authMiddleware'); //
    logger.info('[Routes Clientes] Middleware de Autenticação carregado com sucesso.');
} catch (error) {
    logger.error('[Routes Clientes] ERRO CRÍTICO ao carregar authMiddleware:', error);
    throw new Error('Falha ao carregar middleware de Autenticação.');
}

let upload;
try {
    ({ upload } = require('../middlewares/uploadMiddleware')); //
    if (!upload || typeof upload.single !== 'function') {
        logger.error('[Routes Clientes] ERRO CRÍTICO: Objeto "upload" importado de uploadMiddleware é inválido.');
        throw new Error('Falha ao carregar middleware de Upload.');
    }
    logger.info('[Routes Clientes] Middleware de Upload carregado com sucesso.');
} catch (error) {
    logger.error('[Routes Clientes] ERRO CRÍTICO ao carregar uploadMiddleware:', error);
    throw new Error('Falha ao carregar middleware de Upload.');
}


logger.info('[Routes Clientes] Definindo rotas de Clientes...');

// --- Middleware de Autenticação para todas as rotas ---
router.use(authenticateToken);
logger.debug('[Routes Clientes] Middleware de Autenticação aplicado a /clientes/*.');

// --- Rotas de Clientes ---

// GET /api/clientes - Busca todos os clientes da empresa logada
router.get('/', getAllClientesController);
logger.debug('[Routes Clientes] Rota GET / definida (Listar Clientes).');

// GET /api/clientes/:id - Busca um cliente por ID
router.get('/:id', getClienteByIdController);
logger.debug('[Routes Clientes] Rota GET /:id definida (Buscar Cliente por ID).');

// POST /api/clientes - Cria um novo cliente (com upload opcional de logo)
router.post(
    '/', 
    upload.single('logo'), // 'logo' deve corresponder ao nome do campo no form-data
    createClienteController
); //
logger.debug('[Routes Clientes] Rota POST / definida (Criar Cliente com Upload).');

// PUT /api/clientes/:id - Atualiza um cliente existente (com upload opcional de novo logo)
router.put(
    '/:id', 
    upload.single('logo'), 
    updateClienteController
); //
logger.debug('[Routes Clientes] Rota PUT /:id definida (Atualizar Cliente com Upload).');

// DELETE /api/clientes/:id - Apaga um cliente
router.delete('/:id', deleteClienteController);
logger.debug('[Routes Clientes] Rota DELETE /:id definida (Apagar Cliente).');

logger.info('[Routes Clientes] Rotas de Clientes definidas com sucesso.');

module.exports = router; // Exporta o router configurado
logger.debug('[Routes Clientes] Router exportado.'); // Confirma a exportação