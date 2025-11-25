// middlewares/apiKeyAuthMiddleware.js
const bcrypt = require('bcrypt');
const Empresa = require('../models/Empresa');
const logger = require('../config/logger');

/**
 * Middleware de autenticação via API Key
 * Valida o formato "prefixo_secreto" e compara com o hash armazenado
 */
async function apiKeyAuthMiddleware(req, res, next) {
  logger.info('[ApiKeyAuthMiddleware] Tentando autenticar API Key...');
  
  // 1. Obtém a chave do cabeçalho
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    logger.warn('[ApiKeyAuthMiddleware] Autenticação falhou: Chave de API ausente.');
    return res.status(401).json({ message: 'Chave de API ausente.' });
  }
  
  logger.debug(`[ApiKeyAuthMiddleware] Chave recebida (prefixo parcial): ${apiKey.substring(0, 15)}...`);

  // 2. Lógica para separar prefixo e segredo (assume formato "prefixo_secreto")
  const parts = apiKey.split('_');
  if (parts.length < 2) {
    logger.warn('[ApiKeyAuthMiddleware] Autenticação falhou: Chave de API mal formatada.');
    return res.status(403).json({ message: 'Chave de API mal formatada.' });
  }
  
  const apiKeySecret = parts.pop(); // Última parte é o segredo
  const apiKeyPrefix = parts.join('_'); // O resto é o prefixo

  logger.debug(`[ApiKeyAuthMiddleware] Prefixo: ${apiKeyPrefix}.`);

  try {
    // 3. Busca a empresa pelo PREFIXO
    logger.debug(`[ApiKeyAuthMiddleware] Buscando empresa pelo prefixo: ${apiKeyPrefix}`);
    const empresa = await Empresa.findOne({ api_key_prefix: apiKeyPrefix }).exec();

    if (!empresa) {
      logger.warn(`[ApiKeyAuthMiddleware] Autenticação falhou: Prefixo '${apiKeyPrefix}' não encontrado no DB.`);
      return res.status(403).json({ message: 'Chave de API inválida.' });
    }
    
    // 4. Compara o SEGREDO com o HASH usando bcrypt
    logger.debug('[ApiKeyAuthMiddleware] Empresa encontrada. Comparando segredo com hash...');
    const match = await bcrypt.compare(apiKeySecret, empresa.api_key_hash);

    if (!match) {
      logger.warn(`[ApiKeyAuthMiddleware] Autenticação falhou: Segredo incorreto para o prefixo '${apiKeyPrefix}'.`);
      return res.status(403).json({ message: 'Chave de API inválida.' });
    }
    
    // 5. Sucesso! Anexa o documento da empresa ao request
    req.empresa = empresa;
    
    logger.info(`[ApiKeyAuthMiddleware] Autenticação bem-sucedida para empresa: ${empresa.nome} (ID: ${empresa._id}).`);
    next();
  } catch (err) {
    logger.error(`[ApiKeyAuthMiddleware] ERRO INESPERADO durante a validação da API Key: ${err.message}`, { stack: err.stack });
    next(err);
  }
}

module.exports = apiKeyAuthMiddleware;