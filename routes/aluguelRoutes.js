// routes/aluguelRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const aluguelController = require('../controllers/aluguelController');
const authenticateToken = require('../middlewares/authMiddleware');
const { handleValidationErrors } = require('../validators/authValidator'); // Reutiliza

// Validação
const validateAluguel = [
    body('placa_id').isInt({ gt: 0 }).withMessage('ID da placa é obrigatório.'),
    body('cliente_id').isInt({ gt: 0 }).withMessage('ID do cliente é obrigatório.'),
    body('data_inicio').isISO8601().withMessage('Data de início inválida.'),
    body('data_fim').isISO8601().withMessage('Data final inválida.'),
];

module.exports = () => {
    router.use(authenticateToken); // Protege todas as rotas de aluguel

    // Rota para criar um novo aluguel
    router.post(
        '/',
        validateAluguel,
        handleValidationErrors,
        aluguelController.createAluguel
    );
    
    // Rota para apagar/cancelar um aluguel
    router.delete('/:id', aluguelController.deleteAluguel);

    // Rota para listar todos os alugueis de UMA placa
    router.get('/placa/:placaId', aluguelController.getAlugueisByPlaca);

    return router;
};