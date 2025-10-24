// routes/aluguelRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const mongoose = require('mongoose'); // Para validar ObjectId
const aluguelController = require('../controllers/aluguelController');
const authenticateToken = require('../middlewares/authMiddleware');
const { handleValidationErrors } = require('../validators/authValidator'); // Reutiliza

// Validação para Aluguel (Criar)
const validateAluguel = [
    body('placa_id') // Mantém 'placa_id' conforme o serviço espera
        .notEmpty().withMessage('ID da placa é obrigatório.')
        .isMongoId().withMessage('ID da placa inválido.'), // Valida formato ObjectId

    body('cliente_id') // Mantém 'cliente_id' conforme o serviço espera
        .notEmpty().withMessage('ID do cliente é obrigatório.')
        .isMongoId().withMessage('ID do cliente inválido.'), // Valida formato ObjectId

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
             if (value <= req.body.data_inicio) {
                 throw new Error('A data final deve ser posterior à data inicial.');
             }
             return true;
         }),
];

module.exports = () => {
    router.use(authenticateToken); // Protege todas as rotas de aluguel

    // Rota para criar um novo aluguel
    router.post(
        '/',
        validateAluguel,        // Aplica validação
        handleValidationErrors, // Verifica erros
        aluguelController.createAluguel // Controller
    );

    // Rota para apagar/cancelar um aluguel
    router.delete('/:id', aluguelController.deleteAluguel);

    // Rota para listar todos os alugueis de UMA placa
    router.get('/placa/:placaId', aluguelController.getAlugueisByPlaca);

    return router;
};