import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Custom sanitization middleware for Express
 * Sanitizes req.body and req.params to prevent NoSQL injection
 */
const sanitize = (req: Request, _res: Response, next: NextFunction): void => {
  /**
   * Recursively sanitizes objects by removing MongoDB operators
   */
  const sanitizeObject = (obj: any, path = ''): any => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const keysToCheck = Object.keys(obj);

    for (const key of keysToCheck) {
      const currentPath = path ? `${path}.${key}` : key;

      // Detect MongoDB operators ($, .)
      if (key.startsWith('$') || key.includes('.')) {
        logger.warn(
          `[Security] Tentativa de NoSQL injection detectada - IP: ${req.ip}, Key: ${currentPath}, Method: ${req.method}, URL: ${req.originalUrl}`
        );

        // Remove dangerous key
        delete obj[key];
        continue;
      }

      // Recursively sanitize nested objects
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        obj[key] = sanitizeObject(obj[key], currentPath);
      }
    }

    return obj;
  };

  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize params
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    // Note: req.query is read-only in Express 5
    // Query param validation should be done in route validators

    next();
  } catch (error) {
    logger.error(`[Security] Erro ao sanitizar requisição: ${(error as Error).message}`);
    next(error);
  }
};

export default sanitize;
