import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import AppError from '../utils/AppError';

/**
 * Converts Mongoose Cast errors to operational AppError
 */
const handleCastErrorDB = (err: any): AppError => {
  const message = `Recurso inválido. ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

/**
 * Converts duplicate key errors (code 11000) to operational AppError
 */
const handleDuplicateFieldsDB = (err: any): AppError => {
  const field = Object.keys(err.keyValue || {})[0];
  const value = field ? err.keyValue[field] : 'desconhecido';
  const message = `O campo '${field}' com valor '${value}' já existe. Por favor, use outro valor.`;
  return new AppError(message, 409);
};

/**
 * Converts Mongoose validation errors to operational AppError
 */
const handleValidationErrorDB = (err: any): AppError => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  const message = `Dados de entrada inválidos: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Converts JWT invalid token error
 */
const handleJWTError = (): AppError =>
  new AppError('Token inválido. Por favor, faça login novamente.', 401);

/**
 * Converts JWT expired token error
 */
const handleJWTExpiredError = (): AppError =>
  new AppError('O seu token expirou. Por favor, faça login novamente.', 401);

/**
 * Sends detailed error response (development environment)
 */
const sendErrorDev = (err: any, _req: Request, res: Response): void => {
  if (!err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro desconhecido ocorreu',
      error: 'Error object is undefined',
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  res.status(statusCode).json({
    status,
    message: err.message || 'Erro interno do servidor',
    error: err,
    stack: err.stack,
    validationErrors: err.validationErrors,
  });
};

/**
 * Sends controlled error response (production environment)
 */
const sendErrorProd = (err: any, res: Response): void => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  // Operational error: send message to client
  if (err.isOperational) {
    res.status(statusCode).json({
      status,
      message: err.message || 'Erro no servidor',
      ...(err.validationErrors && { errors: err.validationErrors }),
    });
  } else {
    // Programming or unknown error: don't leak details
    logger.error('ERRO NÃO OPERACIONAL 💥 (PRODUÇÃO)', {
      message: err.message,
      stack: err.stack,
      errorObject: err,
    });

    res.status(500).json({
      status: 'error',
      message: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.',
    });
  }
};

/**
 * Global Error Handling Middleware
 */
const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (!err) {
    logger.error('Error handler recebeu erro undefined');
    res.status(500).json({
      status: 'error',
      message: 'Erro desconhecido ocorreu',
    });
    return;
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Centralized logging
  logger.error(
    `${err.statusCode} - ${err.message || 'Sem mensagem'} - ${req.originalUrl} - ${req.method} - IP: ${req.ip}`,
    { stack: err.stack }
  );

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    // Convert technical errors to operational errors
    let error = {
      ...err,
      message: err.message,
      name: err.name,
      code: err.code,
      keyValue: err.keyValue,
    };

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    if (err.validationErrors) {
      error.validationErrors = err.validationErrors;
      error.isOperational = true;
    }

    sendErrorProd(error, res);
  }
};

export default errorHandler;
