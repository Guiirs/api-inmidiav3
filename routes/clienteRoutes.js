// routes/clienteRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const upload = require('../middlewares/uploadMiddleware'); // Reutiliza o middleware de upload
const clienteController = require('../controllers/clienteController');
const authenticateToken = require('../middlewares/authMiddleware'); //
const { handleValidationErrors } = require('../validators/authValidator'); // Reutiliza o gestor de erros

// Validação
const validateCliente = [
    body('nome').notEmpty().withMessage('O nome do cliente é obrigatório.'),
    body('cnpj').optional({ checkFalsy: true }).isLength({ min: 14, max: 18 }).withMessage('CNPJ deve ter formato válido (ex: 12.345.678/0001-99)'),
    body('telefone').optional({ checkFalsy: true }).isString().trim().escape()
];

module.exports = () => {
    router.use(authenticateToken); // Protege todas as rotas de cliente

    router.get('/', clienteController.getAll);
    
    router.post(
        '/',
        upload.single('logo'), // O campo do formulário deve chamar-se 'logo'
        validateCliente,
        handleValidationErrors, // Adiciona o gestor de erros
        clienteController.create
    );
    
    router.put(
        '/:id',
        upload.single('logo'),
        validateCliente,
        handleValidationErrors, // Adiciona o gestor de erros
        clienteController.update
    );
    
    router.delete('/:id', clienteController.delete);

    return router;
};