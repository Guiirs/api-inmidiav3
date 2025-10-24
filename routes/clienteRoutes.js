// routes/clienteRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const upload = require('../middlewares/uploadMiddleware'); // Middleware de upload
const clienteController = require('../controllers/clienteController');
const authenticateToken = require('../middlewares/authMiddleware');
const { handleValidationErrors } = require('../validators/authValidator'); // Reutiliza o gestor de erros
const { validarCNPJ } = require('../utils/validators'); // Importa validador de CNPJ

// Validação para Cliente (Criar/Atualizar)
const validateCliente = [
    body('nome')
        .trim()
        .notEmpty().withMessage('O nome do cliente é obrigatório.')
        .isLength({ max: 150 }).withMessage('Nome do cliente muito longo (máx 150 caracteres).')
        .escape(), // <-- Adiciona escape

    body('cnpj') // CNPJ não precisa de escape devido ao formato estrito
        .optional({ checkFalsy: true })
        .trim()
        .custom(value => {
            if (value && !validarCNPJ(value)) {
                throw new Error('CNPJ inválido.');
            }
            return true;
        }),

    body('telefone')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 20 }).withMessage('Telefone muito longo (máx 20 caracteres).')
        .escape(), // <-- Adiciona escape
];

module.exports = () => {
    router.use(authenticateToken); // Protege todas as rotas de cliente

    router.get('/', clienteController.getAll);

    router.post(
        '/',
        upload.single('logo'), // Processa upload ANTES da validação de body
        validateCliente,       // Aplica as regras de validação
        handleValidationErrors,// Verifica os erros
        clienteController.create // Executa o controller se não houver erros
    );

    router.put(
        '/:id',
        upload.single('logo'),
        validateCliente,
        handleValidationErrors,
        clienteController.update
    );

    router.delete('/:id', clienteController.delete);

    return router;
};