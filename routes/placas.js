const express = require('express');
const router = express.Router();
// Importa as novas regras de validação do ficheiro que criámos
const { placaValidationRules, handleValidationErrors } = require('../validators/placaValidator');
const upload = require('../middlewares/uploadMiddleware'); // Importa o middleware de upload

// O módulo exporta uma função que recebe a instância 'db' do banco de dados
module.exports = () => {
    const placaController = require('../controllers/placaController');

    router.get('/locations', placaController.getAllPlacaLocations);
    router.get('/', placaController.getAllPlacas);
    router.patch('/:id/disponibilidade', placaController.toggleDisponibilidade);
    router.get('/:id', placaController.getPlacaById);
    router.post(
        '/',
        upload.single('imagem'), // <-- O multer processa um ficheiro do campo 'imagem'
        placaValidationRules(), // <-- UTILIZA AS NOVAS REGRAS
        handleValidationErrors, // <-- UTILIZA O NOVO GESTOR DE ERROS
        placaController.createPlaca
    );
    router.put(
        '/:id',
        upload.single('imagem'), // <-- O multer também processa aqui
        placaValidationRules(), // <-- UTILIZA AS NOVAS REGRAS
        handleValidationErrors, // <-- UTILIZA O NOVO GESTOR DE ERROS
        placaController.updatePlaca
    );
    router.delete('/:id', placaController.deletePlaca);
    return router;
};