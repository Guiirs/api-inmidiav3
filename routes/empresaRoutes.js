// routes/empresaRoutes.js
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

// 1. Importa as regras e o handler de validação (como no original)
let registerValidationRules, handleValidationErrors;
try {
    ({ registerValidationRules, handleValidationErrors } = require('../validators/empresaValidator'));
    if (typeof registerValidationRules !== 'function' || typeof handleValidationErrors !== 'function') {
        logger.error("[Routes Empresa] ERRO CRÍTICO: Validação não exportada corretamente.");
        throw new Error("Validação de Empresa incompleta.");
    }
    logger.info('[Routes Empresa] Validação de Empresa carregada com sucesso.');
} catch (error) {
    logger.error(`[Routes Empresa] ERRO CRÍTICO ao carregar empresaValidator: ${error.message}`);
    throw new Error('Falha ao carregar validação de Empresa.');
}

// 2. Importa o controlador (como no original)
let empresaController;
try {
    empresaController = require('../controllers/empresaController');
    if (typeof empresaController.register !== 'function') {
        logger.error("[Routes Empresa] ERRO CRÍTICO: Controller 'register' não é função.");
        throw new Error("Controller de Empresa incompleto.");
    }
    logger.info('[Routes Empresa] Controller de Empresa carregado com sucesso.');
} catch (error) {
    logger.error(`[Routes Empresa] ERRO CRÍTICO ao carregar empresaController: ${error.message}`);
    throw new Error('Falha ao carregar controller de Empresa.');
}

logger.info('[Routes Empresa] Definindo rotas de Empresa...');

// Rota de registo (Esta rota é pública, não usa authMiddleware)
// POST /api/v1/empresas/register
router.post(
    '/register', 
    (req, res, next) => {
        logger.debug('[Routes Empresa] Rota POST /register acessada. Iniciando validação...');
        next();
    },
    registerValidationRules(), // 1. Regras de validação (mantido)
    handleValidationErrors,    // 2. Handler de erros de validação (mantido)
    empresaController.register // 3. Controller
);
logger.debug('[Routes Empresa] Rota POST /register definida.');

logger.info('[Routes Empresa] Rotas de Empresa definidas com sucesso.');

// [CORREÇÃO] Exporta o router diretamente em vez de uma função
module.exports = router;
logger.debug('[Routes Empresa] Router exportado.');