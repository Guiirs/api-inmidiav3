import jwt from 'jsonwebtoken';
import logger from '../config/logger';
import { Socket } from 'socket.io';

interface DecodedToken {
  id: string;
  empresaId: string;
  role: string;
  username: string;
}

interface AuthSocket extends Socket {
  user?: DecodedToken;
}

/**
 * Middleware de autenticação para conexões Socket.IO
 * Valida JWT token enviado pelo cliente
 */
const socketAuthMiddleware = (socket: AuthSocket, next: (err?: Error) => void): void => {
  try {
    // Extrai token do handshake (pode vir em auth ou query)
    const token = socket.handshake.auth?.token || socket.handshake.query?.token as string;

    if (!token) {
      logger.warn('[SocketAuth] Tentativa de conexão sem token');
      return next(new Error('Authentication error: Token não fornecido'));
    }

    // Valida o token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    // Adiciona dados do usuário ao socket
    socket.user = {
      id: decoded.id,
      empresaId: decoded.empresaId,
      role: decoded.role,
      username: decoded.username,
    };

    logger.info(`[SocketAuth] Usuário autenticado: ${decoded.username} (${decoded.id})`);
    next();
  } catch (error: any) {
    logger.error(`[SocketAuth] Erro de autenticação: ${error.message}`);
    next(new Error('Authentication error: Token inválido'));
  }
};

export default socketAuthMiddleware;
