import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { ObjectId } from 'mongoose';

/**
 * User payload from JWT token
 */
export interface IUserPayload {
  id: string;
  email: string;
  nome?: string;
  role?: string;
  empresaId?: string;
  username?: string;
}

/**
 * Admin payload from JWT token
 */
export interface IAdminPayload {
  id: string;
  username: string;
  role: 'admin' | 'superadmin';
}

/**
 * Extended Express Request with authenticated user
 */
export interface IAuthRequest extends Request {
  user?: IUserPayload | JwtPayload;
}

/**
 * Extended Express Request with authenticated admin
 */
export interface IAdminRequest extends Request {
  admin?: IAdminPayload;
}

/**
 * Extended Express Request with empresa from API Key
 */
export interface IApiKeyRequest extends Request {
  empresa?: {
    _id: ObjectId;
    nome: string;
    cnpj?: string;
  };
}

/**
 * API Response structure
 */
export interface IApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Pagination parameters
 */
export interface IPaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Paginated response
 */
export interface IPaginatedResponse<T> extends IApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Query filters
 */
export interface IQueryFilters {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: any;
}
