// routes/adminRoutes.js
const express = require('express');
const router = express.Router();

// 1. Importe os controladores e middlewares diretamente
const adminController = require('../controllers/adminController');
const authenticateToken = require('../middlewares/authMiddleware');
const adminAuthMiddleware = require('../middlewares/adminAuthMiddleware');

// 2. A exportação do módulo já não recebe 'secretKey'
module.exports = () => {
    // Exemplo de como as suas rotas de admin devem ficar:
    // Todas as rotas de admin usam primeiro a autenticação normal e depois a de admin
    router.use(authenticateToken);
    router.use(adminAuthMiddleware);

    router.get('/users', adminController.getAllUsers);
    router.post('/users', adminController.createUser);
    router.put('/users/:id/role', adminController.updateUserRole);
    router.delete('/users/:id', adminController.deleteUser);
    
    return router;
};