import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import logger from '../config/logger';
import { IAuthRequest, IUserPayload } from '../types/express';
import AppError from '../utils/AppError';

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = (
  req: IAuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    logger.debug('[AuthMiddleware] Tentando autenticar token...');

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      logger.warn('[AuthMiddleware] Token de autenticação ausente na requisição.');
      throw new AppError('Token não fornecido.', 401);
    }

    jwt.verify(token, config.jwtSecret, (err, decoded) => {
      if (err) {
        logger.warn(
          `[AuthMiddleware] Verificação do token falhou: ${err.message}. Status: ${err.name}`
        );
        throw new AppError('Token inválido ou expirado.', 403);
      }

      const user = decoded as IUserPayload;

      if (!user || !user.id || !user.email) {
        logger.error(
          `[AuthMiddleware] Payload do token incompleto para utilizador ID: ${user?.id || 'N/A'}.`
        );
        throw new AppError('Token inválido (payload incompleto).', 403);
      }

      req.user = user;

      logger.debug(
        `[AuthMiddleware] Token validado para utilizador: ${req.user.email} (ID: ${req.user.id})`
      );

      next();
    });
  } catch (error) {
    next(error);
  }
};

export default authenticateToken;
