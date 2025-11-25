// routes/sseRoutes.js
const express = require('express');
const router = express.Router();
const sseController = require('../controllers/sseController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminAuthMiddleware = require('../middlewares/adminAuthMiddleware');
const logger = require('../config/logger');

// Stream de notificações SSE (requer autenticação)
router.get('/stream', authMiddleware, sseController.streamNotificacoes);

// Estatísticas SSE (apenas admin)
router.get('/stats', authMiddleware, adminAuthMiddleware, sseController.getEstatisticas);

logger.info('[Routes SSE] Rotas de Server-Sent Events configuradas');

module.exports = router;
