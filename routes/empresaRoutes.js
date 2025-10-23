// InMidia/backend/routes/empresaRoutes.js
const express = require('express');
const router = express.Router();

// --- ESTA É A CORREÇÃO CRÍTICA ---
// Garante que estamos a importar as regras do NOVO ficheiro de validação.
const { registerValidationRules, handleValidationErrors } = require('../validators/empresaValidator');

const empresaController = require('../controllers/empresaController');

module.exports = () => {
    // A rota de registo agora usa o middleware de validação CORRETO.
    router.post(
        '/register', 
        (req, res, next) => {
            // --- ADICIONE ESTE LOG ---
            console.log('--- ROTA /register ACESSADA ---');
            console.log('CORPO DO PEDIDO RECEBIDO:', req.body);
            next(); // Continua para a validação
        },
        registerValidationRules(), 
        handleValidationErrors, 
        empresaController.register
    );
    
    return router;
};