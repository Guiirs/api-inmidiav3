// CRIE ESTE NOVO FICHEIRO EM: routes/publicRegisterRoutes.js

const express = require('express');
const router = express.Router();
const { registerEmpresaController } = require('../controllers/empresaController');
const { registerValidationRules } = require('../validators/empresaValidator'); // Validador que já existe
const { handleValidationErrors } = require('../validators/authValidator'); // Handler de erros de validação
const logger = require('../config/logger');

logger.info('[Routes Public] Definindo rotas de Registo Público...');

/**
 * @route   POST /api/empresas/register
 * @desc    Regista uma nova empresa e o seu utilizador admin
 * @access  Public
 */
router.post(
    '/register',
    registerValidationRules(), // 1. Validar os dados de entrada (do empresaValidator.js)
    handleValidationErrors,    // 2. Tratar erros de validação (do authValidator.js)
    registerEmpresaController  // 3. Chamar o controlador (do empresaController.js)
);

logger.info('[Routes Public] Rota POST /register definida com validação.');

module.exports = router;