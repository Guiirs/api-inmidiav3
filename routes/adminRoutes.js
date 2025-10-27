// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const logger = require('../config/logger'); // Importa o logger

// 1. Importe os controladores e middlewares
const adminController = require('../controllers/adminController');
const authenticateToken = require('../middlewares/authMiddleware');
const adminAuthMiddleware = require('../middlewares/adminAuthMiddleware');

logger.info('[Routes Admin] Definindo rotas de Administração...');

// Exporta o router configurado
module.exports = () => {
    // Aplica o middleware de autenticação (verifica o token) a todas as rotas de admin
    router.use(authenticateToken);
    logger.debug('[Routes Admin] Middleware de Autenticação aplicado a /admin/*.');
    
    // Aplica o middleware de autorização (verifica a role 'admin') a todas as rotas
    router.use(adminAuthMiddleware);
    logger.debug('[Routes Admin] Middleware de Admin aplicado a /admin/*.');

    // Rotas
    router.get('/users', adminController.getAllUsers);
    logger.debug('[Routes Admin] Rota GET /users definida (Listar Utilizadores).');
    
    router.post('/users', adminController.createUser);
    logger.debug('[Routes Admin] Rota POST /users definida (Criar Utilizador).');
    
    router.put('/users/:id/role', adminController.updateUserRole);
    logger.debug('[Routes Admin] Rota PUT /users/:id/role definida (Atualizar Role).');
    
    router.delete('/users/:id', adminController.deleteUser);
    logger.debug('[Routes Admin] Rota DELETE /users/:id definida (Apagar Utilizador).');
    
    logger.info('[Routes Admin] Rotas de Administração definidas com sucesso.');
    return router;
};