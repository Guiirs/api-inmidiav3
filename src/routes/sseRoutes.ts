// @ts-nocheck
import { Router } from 'express';
import * as sseController from '../controllers/sseController';
import authMiddleware from '../middlewares/authMiddleware';
import adminAuthMiddleware from '../middlewares/adminAuthMiddleware';
import logger from '../config/logger';

const router = Router();

// Stream de notificações SSE (requer autenticação)
router.get('/stream', authMiddleware, sseController.streamNotificacoes);

// Estatísticas SSE (apenas admin)
router.get('/stats', authMiddleware, adminAuthMiddleware, sseController.getEstatisticas);

logger.info('[Routes SSE] Rotas de Server-Sent Events configuradas');

export default router;
