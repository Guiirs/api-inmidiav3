import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import logger from '../config/logger';
import { IAuthRequest } from '../types/express';

/**
 * Global Rate Limiter
 * 2000 requests per minute per IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2000,
  message: {
    message: 'Muitos pedidos deste IP. Tente novamente em 1 minuto.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`[RateLimit] IP ${req.ip} excedeu limite global (2000/min)`);
    res.status(429).json({
      message: 'Muitos pedidos. Tente novamente em 1 minuto.',
    });
  },
});

/**
 * Auth Rate Limiter
 * 10 requests per minute per IP for authentication routes
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skipSuccessfulRequests: false,
  message: {
    message: 'Muitas tentativas de autenticação. Tente novamente em 1 minuto.',
  },
  handler: (req, res) => {
    logger.warn(`[RateLimit] IP ${req.ip} excedeu limite de auth (10/min) - Rota: ${req.path}`);
    res.status(429).json({
      message: 'Muitas tentativas. Aguarde 1 minuto e tente novamente.',
    });
  },
});

/**
 * Admin Rate Limiter
 * 5 requests per minute per user for admin operations
 */
export const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  skipSuccessfulRequests: false,
  message: {
    message: 'Muitos pedidos administrativos. Tente novamente em 1 minuto.',
  },
  handler: (req: Request, res) => {
    const authReq = req as IAuthRequest;
    const identifier = authReq.user?.id || req.ip;
    logger.warn(
      `[RateLimit] Usuário ${identifier} excedeu limite admin (5/min) - Rota: ${req.path}`
    );
    res.status(429).json({
      message: 'Limite de operações administrativas excedido. Aguarde 1 minuto.',
    });
  },
});

/**
 * Report Rate Limiter
 * 20 requests per minute per company for report generation
 */
export const reportRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    message: 'Muitos pedidos de relatório. Tente novamente em 1 minuto.',
  },
  handler: (req: Request, res) => {
    const authReq = req as IAuthRequest;
    const identifier = (authReq.user as any)?.empresaId || req.ip;
    logger.warn(`[RateLimit] Empresa ${identifier} excedeu limite de relatórios (20/min)`);
    res.status(429).json({
      message: 'Limite de geração de relatórios excedido. Aguarde 1 minuto.',
    });
  },
});

/**
 * API Key Regeneration Rate Limiter
 * 3 requests per hour per user (sensitive operation)
 */
export const regenerateApiKeyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  skipSuccessfulRequests: false,
  message: {
    message: 'Limite de regeneração de API Key atingido. Tente novamente em 1 hora.',
  },
  keyGenerator: (req: Request) => {
    const authReq = req as IAuthRequest;
    return `apikey_regen_${authReq.user?.id}_${(authReq.user as any)?.empresaId}`;
  },
  handler: (req: Request, res) => {
    const authReq = req as IAuthRequest;
    logger.warn(
      `[RateLimit] Usuário ${authReq.user?.id} (Empresa: ${(authReq.user as any)?.empresaId}) excedeu limite de regeneração de API Key (3/hora) - IP: ${req.ip}`
    );
    res.status(429).json({
      message:
        'Você atingiu o limite de 3 regenerações de API Key por hora. Por segurança, aguarde antes de tentar novamente.',
      retryAfter: '1 hour',
    });
  },
});
