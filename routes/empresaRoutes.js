// routes/empresaRoutes.js
const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');
const authMiddleware = require('../middlewares/authMiddleware');
const logger = require('../config/logger');

// Importa as validações (que já corrigimos)
const {
    updateEmpresaRules,
    handleValidationErrors,
} = require('../validators/empresaValidator');

// Verificação de segurança (mantida)
if (!updateEmpresaRules || !handleValidationErrors) { 
    logger.error('[Routes Empresa] ERRO CRÍTICO: Validação não exportada corretamente.');
    logger.error('[Routes Empresa] ERRO CRÍTICO ao carregar empresaValidator: Validação de Empresa incompleta.');
    throw new Error('Falha ao carregar validação de Empresa.');
}

// ============================================================================
// ROTAS DE API KEY - DEPRECIADAS
// ============================================================================
// As rotas abaixo foram DEPRECIADAS em favor das rotas em /user/me/empresa
// Mantidas comentadas para referência histórica. Remover em versão futura.
//
// USAR:
//   GET  /api/v1/user/me/empresa (buscar perfil da empresa com api_key_prefix)
//   POST /api/v1/user/me/empresa/regenerate-api-key (regenerar com validação de senha)
//
// router.get('/api-key', authMiddleware, empresaController.getApiKey);
// router.post('/api-key', authMiddleware, empresaController.regenerateApiKey);
// ============================================================================


// --- ROTAS DE DETALHES DA EMPRESA ---

// Rota para BUSCAR os detalhes da empresa (Nome, Endereço, etc.)
router.get(
    '/details',
    authMiddleware,
    empresaController.getEmpresaDetails
);

// Rota para ATUALIZAR os detalhes da empresa
router.put(
    '/details',
    authMiddleware,
    updateEmpresaRules(),     // 1. Valida (endereco, bairro, etc.)
    handleValidationErrors,   // 2. Trata erros de validação
    empresaController.updateEmpresaDetails // 3. Executa o controlador
);

// ------------------------------------

module.exports = router;