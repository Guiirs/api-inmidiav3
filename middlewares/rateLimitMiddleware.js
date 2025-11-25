// middlewares/rateLimitMiddleware.js
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// Helper para gerar chave segura com IPv6
function createKeyGenerator(fallbackToIp = false) {
  return (req) => {
    if (fallbackToIp) {
      // Use o helper do express-rate-limit para IPv6
      return req.ip;
    }
    // Prioriza userId/empresaId se disponível
    return req.user?.id || req.user?.empresaId || req.ip;
  };
}

/**
 * Rate Limiter Global
 * Aplica-se a todas as rotas da API
 * 2000 pedidos por minuto por IP
 */
const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 2000, // 2000 requests por janela
  message: {
    message: 'Muitos pedidos deste IP. Tente novamente em 1 minuto.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`[RateLimit] IP ${req.ip} excedeu limite global (2000/min)`);
    res.status(429).json({
      message: 'Muitos pedidos. Tente novamente em 1 minuto.'
    });
  }
});

/**
 * Rate Limiter para rotas de autenticação sensíveis
 * Ex: forgot-password, reset-password
 * 10 pedidos por minuto por IP
 */
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  skipSuccessfulRequests: false,
  message: {
    message: 'Muitas tentativas de autenticação. Tente novamente em 1 minuto.'
  },
  handler: (req, res) => {
    logger.warn(`[RateLimit] IP ${req.ip} excedeu limite de auth (10/min) - Rota: ${req.path}`);
    res.status(429).json({
      message: 'Muitas tentativas. Aguarde 1 minuto e tente novamente.'
    });
  }
});

/**
 * Rate Limiter para rotas administrativas caras
 * Ex: executar scripts, regenerar API keys
 * 5 pedidos por minuto por usuário
 */
const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  skipSuccessfulRequests: false,
  message: {
    message: 'Muitos pedidos administrativos. Tente novamente em 1 minuto.'
  },
  // Usa apenas IP (express-rate-limit lida com IPv6 automaticamente)
  handler: (req, res) => {
    const identifier = req.user?.id || req.ip;
    logger.warn(`[RateLimit] Usuário ${identifier} excedeu limite admin (5/min) - Rota: ${req.path}`);
    res.status(429).json({
      message: 'Limite de operações administrativas excedido. Aguarde 1 minuto.'
    });
  }
});

/**
 * Rate Limiter para geração de relatórios/PDFs
 * 20 pedidos por minuto por empresa
 */
const reportRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    message: 'Muitos pedidos de relatório. Tente novamente em 1 minuto.'
  },
  // Usa apenas IP (express-rate-limit lida com IPv6 automaticamente)
  handler: (req, res) => {
    const identifier = req.user?.empresaId || req.ip;
    logger.warn(`[RateLimit] Empresa ${identifier} excedeu limite de relatórios (20/min)`);
    res.status(429).json({
      message: 'Limite de geração de relatórios excedido. Aguarde 1 minuto.'
    });
  }
});

/**
 * Rate Limiter específico para regeneração de API Key
 * 3 pedidos por hora por usuário (operação sensível)
 * Mais restritivo que outras operações admin
 */
const regenerateApiKeyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 regenerações por hora
  skipSuccessfulRequests: false,
  message: {
    message: 'Limite de regeneração de API Key atingido. Tente novamente em 1 hora.'
  },
  keyGenerator: (req) => {
    // Usa userId + empresaId para garantir limite por usuário e empresa
    return `apikey_regen_${req.user?.id}_${req.user?.empresaId}`;
  },
  handler: (req, res) => {
    logger.warn(`[RateLimit] Usuário ${req.user?.id} (Empresa: ${req.user?.empresaId}) excedeu limite de regeneração de API Key (3/hora) - IP: ${req.ip}`);
    res.status(429).json({
      message: 'Você atingiu o limite de 3 regenerações de API Key por hora. Por segurança, aguarde antes de tentar novamente.',
      retryAfter: '1 hour'
    });
  }
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  adminRateLimiter,
  reportRateLimiter,
  regenerateApiKeyLimiter
};
