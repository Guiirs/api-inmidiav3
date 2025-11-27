// @ts-nocheck
import { Router } from 'express';
import logger from '../config/logger';
import * as publicApiController from '../controllers/publicApiController';
import apiKeyAuthMiddleware from '../middlewares/apiKeyAuthMiddleware';

const router = Router();

logger.info('[Routes PublicAPI] Componentes carregados com sucesso.');
logger.info('[Routes PublicAPI] Definindo rotas da API Pública...');

// Aplica o middleware de autenticação por API Key a todas as rotas públicas
router.use(apiKeyAuthMiddleware);
logger.debug('[Routes PublicAPI] Middleware de API Key aplicado a /public/*.');

// GET /api/v1/public/placas/disponiveis
router.get('/placas/disponiveis', publicApiController.getAvailablePlacas);
logger.debug('[Routes PublicAPI] Rota GET /placas/disponiveis definida (Placas Disponíveis).');

logger.info('[Routes PublicAPI] Rotas da API Pública definidas com sucesso.');
logger.debug('[Routes PublicAPI] Router exportado.');

export default router;
