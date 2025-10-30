// routes/regiaoRoutes.js
const express = require('express');
const router = express.Router();
// [MELHORIA] Importa 'param' para validar IDs na URL
const { body, param } = require('express-validator');
const logger = require('../config/logger');

// 1. Importa controladores e middlewares (mantido do original)
let regiaoController, authenticateToken, handleValidationErrors;
try {
    regiaoController = require('../controllers/regiaoController');
    authenticateToken = require('../middlewares/authMiddleware');
    // Reutiliza o handler de erros de validação
    ({ handleValidationErrors } = require('../validators/authValidator')); 
    
    if (typeof regiaoController.getAllRegioes !== 'function' || typeof authenticateToken !== 'function') {
        logger.error('[Routes Regiao] ERRO CRÍTICO: Controllers ou Middleware de Regiao ausentes.');
        throw new Error('Componentes de Região incompletos.');
    }
    logger.info('[Routes Regiao] Componentes carregados com sucesso.');
} catch (error) {
    logger.error(`[Routes Regiao] ERRO CRÍTICO ao carregar dependências: ${error.message}`);
    throw new Error('Falha ao carregar dependências de Região.');
}


// Regras de validação para o corpo (body) de Regiao (Criar/Atualizar)
const validateRegiaoBody = [
    body('nome')
        .trim() // Remove espaços extras
        .notEmpty().withMessage('O nome da região é obrigatório.')
        .isLength({ max: 100 }).withMessage('Nome da região muito longo (máx 100 caracteres).')
        .escape() // Adiciona escape HTML
];

// [MELHORIA] Regras de validação para o ID do parâmetro
const validateIdParam = [
    param('id').isMongoId().withMessage('O ID da região fornecido é inválido.')
];

logger.info('[Routes Regiao] Definindo rotas de Regiões...');

// Aplica o middleware de autenticação a todas as rotas de região
router.use(authenticateToken);
logger.debug('[Routes Regiao] Middleware de Autenticação aplicado a /regioes/*.');

// Rota GET /api/v1/regioes - Lista todas as regiões
router.get('/', regiaoController.getAllRegioes);
logger.debug('[Routes Regiao] Rota GET / definida (Listar Regiões).');

// Rota POST /api/v1/regioes - Cria uma nova região
router.post(
    '/',
    validateRegiaoBody,     // 1. Aplica validação de body
    handleValidationErrors, // 2. Verifica erros de validação
    regiaoController.createRegiao
);
logger.debug('[Routes Regiao] Rota POST / definida (Criar Região).');

// Rota PUT /api/v1/regioes/:id - Atualiza o nome de uma região
router.put(
    '/:id',
    validateIdParam,        // 1. [MELHORIA] Valida o ID do parâmetro
    validateRegiaoBody,     // 2. Aplica validação de body
    handleValidationErrors, // 3. Verifica erros de validação
    regiaoController.updateRegiao
);
logger.debug('[Routes Regiao] Rota PUT /:id definida (Atualizar Região).');

// Rota DELETE /api/v1/regioes/:id - Apaga uma região
router.delete(
    '/:id', 
    validateIdParam,        // 1. [MELHORIA] Valida o ID do parâmetro
    handleValidationErrors, // 2. Verifica erros de validação
    regiaoController.deleteRegiao
);
logger.debug('[Routes Regiao] Rota DELETE /:id definida (Apagar Região).');

logger.info('[Routes Regiao] Rotas de Regiões definidas com sucesso.');

// [CORREÇÃO] Exporta o router diretamente
module.exports = router;
logger.debug('[Routes Regiao] Router exportado.');