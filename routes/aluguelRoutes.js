// routes/aluguelRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const mongoose = require('mongoose'); // Para validar ObjectId
const aluguelController = require('../controllers/aluguelController');
const authenticateToken = require('../middlewares/authMiddleware');
const { handleValidationErrors } = require('../validators/authValidator'); // Reutiliza
const logger = require('../config/logger'); // Importa o logger

// Validação para Aluguel (Criar)
const validateAluguel = [
    // Validação dos IDs
    body('placa_id')
        .notEmpty().withMessage('ID da placa é obrigatório.')
        .isMongoId().withMessage('ID da placa inválido.'),

    body('cliente_id')
        .notEmpty().withMessage('ID do cliente é obrigatório.')
        .isMongoId().withMessage('ID do cliente inválido.'),

    // Validação das datas
    body('data_inicio')
        .notEmpty().withMessage('Data de início é obrigatória.')
        .isISO8601().withMessage('Data de início inválida (formato YYYY-MM-DD).')
        .toDate(), // Converte para objeto Date

    body('data_fim')
        .notEmpty().withMessage('Data final é obrigatória.')
        .isISO8601().withMessage('Data final inválida (formato YYYY-MM-DD).')
        .toDate() // Converte para objeto Date
        .custom((value, { req }) => {
             // Validação customizada para garantir data_fim > data_inicio
             if (!req.body.data_inicio || value <= req.body.data_inicio) {
                 throw new Error('A data final deve ser posterior à data inicial.');
             }
             return true;
         }),
];

logger.info('[Routes Aluguel] Definindo rotas de Alugueis...');

module.exports = () => {
    // Aplica o middleware de autenticação a todas as rotas de aluguel
    router.use(authenticateToken);
    logger.debug('[Routes Aluguel] Middleware de Autenticação aplicado a /alugueis/*.');

    // Rota para criar um novo aluguel
    router.post(
        '/',
        validateAluguel,        // Aplica validação de body
        handleValidationErrors, // Verifica erros de validação
        aluguelController.createAluguel
    );
    logger.debug('[Routes Aluguel] Rota POST / definida (Criar Aluguel).');

    // Rota para apagar/cancelar um aluguel
    router.delete('/:id', aluguelController.deleteAluguel);
    logger.debug('[Routes Aluguel] Rota DELETE /:id definida (Apagar Aluguel).');

    // Rota para listar todos os alugueis de UMA placa
    router.get('/placa/:placaId', aluguelController.getAlugueisByPlaca);
    logger.debug('[Routes Aluguel] Rota GET /placa/:placaId definida (Listar por Placa).');

    logger.info('[Routes Aluguel] Rotas de Alugueis definidas com sucesso.');
    return router;
};