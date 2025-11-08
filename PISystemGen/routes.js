const express = require('express');
const router = express.Router();
const controller = require('./controller');
const authenticateToken = require('../middlewares/authMiddleware');

// Protegido: usuário autenticado
router.post('/generate', authenticateToken, controller.postGenerate);
router.get('/status/:jobId', authenticateToken, controller.getStatus);

module.exports = router;
