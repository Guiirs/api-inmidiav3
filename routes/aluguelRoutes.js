// routes/aluguelRoutes.js
const express = require('express');
const router = express.Router();
const aluguelController = require('../controllers/aluguelController');
const authenticateToken = require('../middlewares/authMiddleware');
const aluguelValidator = require('../validators/aluguelValidator');
// Reutiliza o handler de erros de validação
const { handleValidationErrors } = require('../validators/authValidator'); 
const logger = require('../config/logger');

logger.info('[Routes Aluguel] Definindo rotas de Alugueis...');

// Aplica o middleware de autenticação a todas as rotas de aluguel
router.use(authenticateToken);
logger.debug('[Routes Aluguel] Middleware de Autenticação aplicado a /alugueis/*.');

// Rota para criar um novo aluguel
// POST /api/v1/alugueis/
router.post(
    '/',
    authenticateToken, // 1. Autentica
    aluguelValidator.validateAluguel, // 2. Valida campos básicos
    handleValidationErrors, // 3. Trata os erros
    aluguelValidator.validateBiWeekAlignment, // 4. [NOVO] Valida Bi-Semana (se habilitado)
    aluguelController.createAluguel // 5. Chama o controller
);
logger.debug('[Routes Aluguel] Rota POST / definida (Criar Aluguel).');

// Rota para apagar/cancelar um aluguel
// DELETE /api/v1/alugueis/:id
router.delete(
    '/:id',
    authenticateToken, // 1. Autentica
    aluguelValidator.validateIdParam, // 2. Valida
    handleValidationErrors, // 3. Trata os erros
    aluguelController.deleteAluguel // 4. Chama o controller
);
logger.debug('[Routes Aluguel] Rota DELETE /:id definida (Apagar Aluguel).');

// Rota para listar todos os alugueis de UMA placa
// GET /api/v1/alugueis/placa/:placaId
router.get(
    '/placa/:placaId',
    authenticateToken, // 1. Autentica
    aluguelValidator.validatePlacaIdParam, // 2. Valida o ID da placa na URL
    handleValidationErrors, // 3. Trata os erros
    aluguelController.getAlugueisByPlaca // 4. Chama o controller
);
logger.debug('[Routes Aluguel] Rota GET /placa/:placaId definida (Listar por Placa).');

logger.info('[Routes Aluguel] Rotas de Alugueis definidas com sucesso.');

// [CORREÇÃO] Exporta o router diretamente
module.exports = router;
logger.debug('[Routes Aluguel] Router exportado.');