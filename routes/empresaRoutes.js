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

// Rota para buscar a API Key
router.get('/api-key', authMiddleware, empresaController.getApiKey);

// Rota para regenerar a API Key
router.post('/api-key', authMiddleware, empresaController.regenerateApiKey);


// --- ROTAS NOVAS ADICIONADAS AQUI ---

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