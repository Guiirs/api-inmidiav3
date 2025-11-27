/**
 * Custom operational error class for API errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly isOperational: boolean;

  /**
   * Creates an instance of AppError
   * @param message - Descriptive error message
   * @param statusCode - HTTP status code (e.g., 400, 404, 500)
   */
  constructor(message: string, statusCode: number) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Maintains proper stack trace for debugging
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
