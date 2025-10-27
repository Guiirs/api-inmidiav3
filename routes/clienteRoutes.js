// routes/clienteRoutes.js (CORRIGIDO)

const express = require('express');
const router = express.Router();
const logger = require('../config/logger'); // Adiciona logger

// <<< ALTERADO: Importa as funções específicas do controller >>>
let createClienteController, updateClienteController, getAllClientesController, getClienteByIdController, deleteClienteController;
try {
    ({
        createClienteController,
        updateClienteController,
        getAllClientesController,
        getClienteByIdController,
        deleteClienteController
    } = require('../controllers/clienteController')); //
    logger.info('[Routes Clientes] Controllers de Cliente carregados com sucesso.');
} catch (error) {
    logger.error('[Routes Clientes] ERRO CRÍTICO ao carregar clienteController:', error);
    throw new Error('Falha ao carregar controllers de Cliente.');
}

// <<< ALTERADO: Importa authMiddleware (se ainda não estiver) >>>
let authMiddleware;
try {
    authMiddleware = require('../middlewares/authMiddleware'); //
    logger.info('[Routes Clientes] Middleware de Autenticação carregado com sucesso.');
} catch (error) {
    logger.error('[Routes Clientes] ERRO CRÍTICO ao carregar authMiddleware:', error);
    throw new Error('Falha ao carregar middleware de Autenticação.');
}

// <<< ALTERADO: Importa upload (se ainda não estiver) >>>
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

// --- Rotas de Clientes ---

// GET /api/clientes - Busca todos os clientes da empresa logada
// <<< ALTERADO: Usa a função importada diretamente >>>
router.get('/', authMiddleware, getAllClientesController);
logger.debug('[Routes Clientes] Rota GET / definida.');

// GET /api/clientes/:id - Busca um cliente por ID
// <<< ALTERADO: Usa a função importada diretamente >>>
router.get('/:id', authMiddleware, getClienteByIdController);
logger.debug('[Routes Clientes] Rota GET /:id definida.');

// POST /api/clientes - Cria um novo cliente
// <<< ALTERADO: Usa a função importada diretamente >>>
router.post('/', authMiddleware, upload.single('logo'), createClienteController); // 'logo' deve corresponder ao nome do campo no form-data
logger.debug('[Routes Clientes] Rota POST / definida.');

// PUT /api/clientes/:id - Atualiza um cliente existente
// <<< ALTERADO: Usa a função importada diretamente >>>
router.put('/:id', authMiddleware, upload.single('logo'), updateClienteController);
logger.debug('[Routes Clientes] Rota PUT /:id definida.');

// DELETE /api/clientes/:id - Apaga um cliente
// <<< ALTERADO: Usa a função importada diretamente >>>
router.delete('/:id', authMiddleware, deleteClienteController);
logger.debug('[Routes Clientes] Rota DELETE /:id definida.');

logger.info('[Routes Clientes] Rotas de Clientes definidas com sucesso.');

module.exports = router;
logger.debug('[Routes Clientes] Router exportado.');