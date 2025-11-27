// src/services/cacheService.ts
// @ts-nocheck
import logger from '../config/logger';

let redisClient: any = null;
let isRedisAvailable = false;

async function initializeRedis() {
  try {
    if (!process.env.REDIS_HOST && process.env.NODE_ENV !== 'production') {
      logger.info('[CacheService] Redis não configurado. Cache desabilitado (modo desenvolvimento).');
      return;
    }

    const redis = require('redis');
    
    const config: any = {
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10)
      }
    };

    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }

    redisClient = redis.createClient(config);

    redisClient.on('error', (err: any) => {
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
    
  } catch (error: any) {
    logger.warn('[CacheService] Redis não disponível:', error.message);
    logger.info('[CacheService] Continuando sem cache (fallback para DB).');
    isRedisAvailable = false;
  }
}

async function get(key: string): Promise<any> {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    if (!value) return null;
    
    logger.debug(`[CacheService] Cache HIT: ${key}`);
    return JSON.parse(value);
  } catch (error: any) {
    logger.warn(`[CacheService] Erro ao ler cache ${key}:`, error.message);
    return null;
  }
}

async function set(key: string, value: any, ttl: number = parseInt(process.env.CACHE_TTL || '300', 10)) {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    const serialized = JSON.stringify(value);
    await redisClient.setEx(key, ttl, serialized);
    logger.debug(`[CacheService] Cache SET: ${key} (TTL: ${ttl}s)`);
  } catch (error: any) {
    logger.warn(`[CacheService] Erro ao escrever cache ${key}:`, error.message);
  }
}

async function del(keys: string | string[]) {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    await redisClient.del(keysArray);
    logger.debug(`[CacheService] Cache DEL: ${keysArray.join(', ')}`);
  } catch (error: any) {
    logger.warn(`[CacheService] Erro ao deletar cache:`, error.message);
  }
}

async function invalidatePattern(pattern: string) {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`[CacheService] Invalidadas ${keys.length} chaves com padrão: ${pattern}`);
    }
  } catch (error: any) {
    logger.warn(`[CacheService] Erro ao invalidar padrão ${pattern}:`, error.message);
  }
}

function isAvailable(): boolean {
  return isRedisAvailable;
}

async function disconnect() {
  if (redisClient && isRedisAvailable) {
    await redisClient.quit();
    logger.info('[CacheService] Desconectado do Redis.');
  }
}

export default {
  initializeRedis,
  get,
  set,
  del,
  invalidatePattern,
  isAvailable,
  disconnect
};
