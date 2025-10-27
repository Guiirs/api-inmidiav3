// routes/regiaoRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const logger = require('../config/logger'); // Importa o logger

// 1. Importa controladores e middlewares
let regiaoController, authenticateToken, handleValidationErrors;
try {
    regiaoController = require('../controllers/regiaoController');
    authenticateToken = require('../middlewares/authMiddleware');
    ({ handleValidationErrors } = require('../validators/authValidator')); // Reutiliza o handler de erros
    
    if (typeof regiaoController.getAllRegioes !== 'function' || typeof authenticateToken !== 'function') {
        logger.error('[Routes Regiao] ERRO CRÍTICO: Controllers ou Middleware de Regiao ausentes.');
        throw new Error('Componentes de Região incompletos.');
    }
    logger.info('[Routes Regiao] Componentes carregados com sucesso.');
} catch (error) {
    logger.error(`[Routes Regiao] ERRO CRÍTICO ao carregar dependências: ${error.message}`);
    throw new Error('Falha ao carregar dependências de Região.');
}


// Regras de validação para Regiao (Criar/Atualizar)
const validateRegiao = [
    body('nome')
        .trim() // Remove espaços extras
        .notEmpty().withMessage('O nome da região é obrigatório.')
        .isLength({ max: 100 }).withMessage('Nome da região muito longo (máx 100 caracteres).')
        .escape() // Adiciona escape HTML
];

logger.info('[Routes Regiao] Definindo rotas de Regiões...');

module.exports = () => {
    // Aplica o middleware de autenticação a todas as rotas de região
    router.use(authenticateToken);
    logger.debug('[Routes Regiao] Middleware de Autenticação aplicado a /regioes/*.');
    
    // Rota GET /api/regioes - Lista todas as regiões
    router.get('/', regiaoController.getAllRegioes);
    logger.debug('[Routes Regiao] Rota GET / definida (Listar Regiões).');

    // Rota POST /api/regioes - Cria uma nova região
    router.post(
        '/',
        validateRegiao,         // Aplica validação de body
        handleValidationErrors, // Verifica erros de validação
        regiaoController.createRegiao
    );
    logger.debug('[Routes Regiao] Rota POST / definida (Criar Região).');

    // Rota PUT /api/regioes/:id - Atualiza o nome de uma região
    router.put(
        '/:id',
        validateRegiao,         // Aplica validação de body
        handleValidationErrors, // Verifica erros de validação
        regiaoController.updateRegiao
    );
    logger.debug('[Routes Regiao] Rota PUT /:id definida (Atualizar Região).');

    // Rota DELETE /api/regioes/:id - Apaga uma região
    router.delete('/:id', regiaoController.deleteRegiao);
    logger.debug('[Routes Regiao] Rota DELETE /:id definida (Apagar Região).');
    
    logger.info('[Routes Regiao] Rotas de Regiões definidas com sucesso.');
    return router;
};