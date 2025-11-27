import { Response, NextFunction } from 'express';
import logger from '../config/logger';
import { IAuthRequest } from '../types/express';
import AppError from '../utils/AppError';

/**
 * Middleware to verify admin role
 */
const isAdmin = (req: IAuthRequest, _res: Response, next: NextFunction): void => {
  try {
    logger.debug('[AdminAuthMiddleware] Verificando permissão de administrador...');

    if (!req.user) {
      logger.warn(
        '[AdminAuthMiddleware] Acesso negado: req.user ausente (falha de autenticação prévia?).'
      );
      throw new AppError(
        'Acesso negado. Token inválido ou dados do utilizador em falta.',
        403
      );
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === 'admin' || userRole === 'superadmin') {
      logger.debug(`[AdminAuthMiddleware] Admin ${userId} autenticado. Acesso permitido.`);
      next();
    } else {
      logger.warn(
        `[AdminAuthMiddleware] Utilizador ${userId} (Role: ${userRole}) tentou aceder a rota restrita. Acesso negado.`
      );
      throw new AppError(
        'Acesso negado. Apenas administradores podem realizar esta ação.',
        403
      );
    }
  } catch (error) {
    next(error);
  }
};

export default isAdmin;
