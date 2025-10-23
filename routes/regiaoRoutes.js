// routes/regiaoRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator'); // Importa o validador

module.exports = () => {
    const regiaoController = require('../controllers/regiaoController');
    // Rota para buscar todas as regiões (já existe)
    router.get('/', regiaoController.getAllRegioes);

    // --- NOVAS ROTAS ---

    // Rota para criar uma nova região
    router.post(
        '/', 
        [ body('nome').notEmpty().withMessage('O nome da região é obrigatório.') ], 
        regiaoController.createRegiao
    );

    // Rota para atualizar uma região
    router.put(
        '/:id',
        [ body('nome').notEmpty().withMessage('O nome da região é obrigatório.') ],
        regiaoController.updateRegiao
    );

    // Rota para apagar uma região
    router.delete('/:id', regiaoController.deleteRegiao);

    return router;
};