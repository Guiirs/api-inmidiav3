// services/cacheService.js
const logger = require('../config/logger');

/**
 * Serviço de Cache usando Redis
 * Fornece métodos para get/set/delete com TTL configurável
 * 
 * Configuração: 
 * - REDIS_HOST (default: localhost)
 * - REDIS_PORT (default: 6379)
 * - REDIS_PASSWORD (opcional)
 * - CACHE_TTL (default: 300 segundos)
 */

let redisClient = null;
let isRedisAvailable = false;

// Tenta inicializar Redis se disponível
async function initializeRedis() {
  try {
    // Apenas tenta carregar redis se as variáveis de ambiente indicarem uso
    if (!process.env.REDIS_HOST && process.env.NODE_ENV !== 'production') {
      logger.info('[CacheService] Redis não configurado. Cache desabilitado (modo desenvolvimento).');
      return;
    }

    const redis = require('redis');
    
    const config = {
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10)
      }
    };

    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }

    redisClient = redis.createClient(config);

    redisClient.on('error', (err) => {
      logger.error('[CacheService] Erro de conexão Redis:', err.message);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      logger.info('[CacheService] ✅ Conectado ao Redis.');
      isRedisAvailable = true;
    });

    redisClient.on('ready', () => {
      logger.info('[CacheService] Redis pronto para uso.');
      isRedisAvailable = true;
    });

    await redisClient.connect();
    
  } catch (error) {
    logger.warn('[CacheService] Redis não disponível:', error.message);
    logger.info('[CacheService] Continuando sem cache (fallback para DB).');
    isRedisAvailable = false;
  }
}

/**
 * Obtém valor do cache
 * @param {string} key - Chave do cache
 * @returns {Promise<any|null>} - Valor parseado ou null se não existir
 */
async function get(key) {
  if (!isRedisAvailable || !redisClient) {
    return null; // Fallback silencioso
  }

  try {
    const value = await redisClient.get(key);
    if (!value) return null;
    
    logger.debug(`[CacheService] Cache HIT: ${key}`);
    return JSON.parse(value);
  } catch (error) {
    logger.warn(`[CacheService] Erro ao ler cache ${key}:`, error.message);
    return null;
  }
}

/**
 * Define valor no cache com TTL
 * @param {string} key - Chave do cache
 * @param {any} value - Valor a ser armazenado (será serializado para JSON)
 * @param {number} ttl - Time to live em segundos (default: 300)
 */
async function set(key, value, ttl = parseInt(process.env.CACHE_TTL || '300', 10)) {
  if (!isRedisAvailable || !redisClient) {
    return; // Fallback silencioso
  }

  try {
    const serialized = JSON.stringify(value);
    await redisClient.setEx(key, ttl, serialized);
    logger.debug(`[CacheService] Cache SET: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    logger.warn(`[CacheService] Erro ao escrever cache ${key}:`, error.message);
  }
}

/**
 * Remove uma ou mais chaves do cache
 * @param {string|string[]} keys - Chave(s) a remover
 */
async function del(keys) {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    await redisClient.del(keysArray);
    logger.debug(`[CacheService] Cache DEL: ${keysArray.join(', ')}`);
  } catch (error) {
    logger.warn(`[CacheService] Erro ao deletar cache:`, error.message);
  }
}

/**
 * Invalida cache por padrão (ex: "placas:*")
 * @param {string} pattern - Padrão para buscar chaves (ex: "empresa:123:*")
 */
async function invalidatePattern(pattern) {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`[CacheService] Invalidadas ${keys.length} chaves com padrão: ${pattern}`);
    }
  } catch (error) {
    logger.warn(`[CacheService] Erro ao invalidar padrão ${pattern}:`, error.message);
  }
}

/**
 * Verifica se Redis está disponível
 */
function isAvailable() {
  return isRedisAvailable;
}

/**
 * Fecha conexão Redis (para shutdown graceful)
 */
async function disconnect() {
  if (redisClient && isRedisAvailable) {
    await redisClient.quit();
    logger.info('[CacheService] Desconectado do Redis.');
  }
}

module.exports = {
  initializeRedis,
  get,
  set,
  del,
  invalidatePattern,
  isAvailable,
  disconnect
};
