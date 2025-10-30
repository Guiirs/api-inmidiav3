// routes/clienteRoutes.js
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

// [MELHORIA] Importa validadores de 'body' e 'param'
const { body, param } = require('express-validator');
// [MELHORIA] Importa o handler de erros de validação
const { handleValidationErrors } = require('../validators/authValidator');
// [MELHORIA] Importa o validador customizado de CNPJ
const { validarCNPJ } = require('../utils/validators'); 

// Importa controladores e middlewares (como no original)
const {
    createClienteController,
    updateClienteController,
    getAllClientesController,
    getClienteByIdController,
    deleteClienteController
} = require('../controllers/clienteController');
const authenticateToken = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

// --- [MELHORIA] Define regras de validação ---

// Validação para o ID na URL
const validateIdParam = [
    param('id').isMongoId().withMessage('O ID do cliente fornecido é inválido.')
];

// Validação para o corpo (body) da requisição
const validateClienteBody = [
    body('nome')
        .trim()
        .notEmpty().withMessage('O nome do cliente é obrigatório.')
        .isLength({ max: 150 }).withMessage('Nome muito longo (máx 150 caracteres).')
        .escape(), // Proteção contra XSS
    body('cnpj')
        .optional({ checkFalsy: true }) // Permite CNPJ vazio ou nulo
        .trim()
        .custom(value => {
            // Valida o CNPJ apenas se for fornecido
            if (value && !validarCNPJ(value)) { 
                throw new Error('O CNPJ fornecido é inválido.');
            }
            return true;
        }),
    body('telefone')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 50 }).withMessage('Telefone muito longo (máx 50 caracteres).')
        .escape() // Proteção contra XSS
];

logger.info('[Routes Clientes] Definindo rotas de Clientes...');

// --- Middleware de Autenticação para todas as rotas ---
router.use(authenticateToken);
logger.debug('[Routes Clientes] Middleware de Autenticação aplicado a /clientes/*.');

// --- Rotas de Clientes ---

// GET /api/v1/clientes - Busca todos os clientes
router.get('/', getAllClientesController);
logger.debug('[Routes Clientes] Rota GET / definida (Listar Clientes).');

// GET /api/v1/clientes/:id - Busca um cliente por ID
router.get(
    '/:id',
    validateIdParam,        // [MELHORIA] Valida o ID
    handleValidationErrors, // [MELHORIA] Trata o erro de validação
    getClienteByIdController
);
logger.debug('[Routes Clientes] Rota GET /:id definida (Buscar Cliente por ID).');

// POST /api/v1/clientes - Cria um novo cliente (com upload opcional de logo)
router.post(
    '/', 
    upload.single('logo'),    // 'logo' deve corresponder ao nome do campo no form-data
    validateClienteBody,    // [MELHORIA] Valida o body
    handleValidationErrors,   // [MELHORIA] Trata os erros
    createClienteController
);
logger.debug('[Routes Clientes] Rota POST / definida (Criar Cliente com Upload).');

// PUT /api/v1/clientes/:id - Atualiza um cliente (com upload opcional de logo)
router.put(
    '/:id', 
    upload.single('logo'), 
    validateIdParam,        // [MELHORIA] Valida o ID
    validateClienteBody,    // [MELHORIA] Valida o body
    handleValidationErrors,   // [MELHORIA] Trata os erros
    updateClienteController
);
logger.debug('[Routes Clientes] Rota PUT /:id definida (Atualizar Cliente com Upload).');

// DELETE /api/v1/clientes/:id - Apaga um cliente
router.delete(
    '/:id', 
    validateIdParam,        // [MELHORIA] Valida o ID
    handleValidationErrors,   // [MELHORIA] Trata os erros
    deleteClienteController
);
logger.debug('[Routes Clientes] Rota DELETE /:id definida (Apagar Cliente).');

logger.info('[Routes Clientes] Rotas de Clientes definidas com sucesso.');

// Exporta o router (já estava correto)
module.exports = router;
logger.debug('[Routes Clientes] Router exportado.');