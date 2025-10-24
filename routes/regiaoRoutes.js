// routes/regiaoRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const regiaoController = require('../controllers/regiaoController');
// Reutiliza o handleValidationErrors de outro validador (ex: authValidator)
const { handleValidationErrors } = require('../validators/authValidator');

// Regras de validação para Regiao (Criar/Atualizar)
const validateRegiao = [
    body('nome')
        .trim() // Remove espaços extras
        .notEmpty().withMessage('O nome da região é obrigatório.')
        .isLength({ max: 100 }).withMessage('Nome da região muito longo (máx 100 caracteres).')
        .escape() // <-- Adiciona escape HTML
];

module.exports = () => {
    // Rota GET não precisa de validação de body
    router.get('/', regiaoController.getAllRegioes);

    // Rota POST para criar
    router.post(
        '/',
        validateRegiao,         // Aplica validação
        handleValidationErrors, // Verifica erros
        regiaoController.createRegiao // Controller
    );

    // Rota PUT para atualizar
    router.put(
        '/:id',
        validateRegiao,         // Aplica validação
        handleValidationErrors, // Verifica erros
        regiaoController.updateRegiao // Controller
    );

    // Rota DELETE não precisa de validação de body
    router.delete('/:id', regiaoController.deleteRegiao);

    // Adiciona middleware de autenticação a todas as rotas de região
    // (Verificação: Já está a ser feito no server.js com app.use('/regioes', authMiddleware, ...))
    // Se não estivesse, adicionaríamos: router.use(require('../middlewares/authMiddleware')); aqui.

    return router;
};