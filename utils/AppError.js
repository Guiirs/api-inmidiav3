// utils/AppError.js

/**
 * Classe de erro customizada para erros operacionais da aplicação.
 * Permite definir um statusCode HTTP e diferenciar erros esperados de bugs.
 */
class AppError extends Error {
  /**
   * Cria uma instância de AppError.
   * @param {string} message - A mensagem de erro descritiva.
   * @param {number} statusCode - O código de status HTTP (ex: 400, 404, 500).
   * @param {string} [field=null] - Opcional. O nome do campo específico relacionado ao erro (ex: 'email').
   * @param {string} [errorCode=null] - Opcional. Um código de erro customizado (ex: 'DUPLICATE_EMAIL').
   */
  constructor(message, statusCode, field = null, errorCode = null) {
    super(message); // Chama o construtor da classe Error pai

    this.statusCode = statusCode;
    // Define o status com base no statusCode (fail para 4xx, error para 5xx)
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    // Marca este erro como operacional (erro esperado da aplicação, não um bug desconhecido)
    this.isOperational = true;
    this.field = field; // Campo específico relacionado ao erro (útil para formulários)
    this.errorCode = errorCode; // Código de erro customizado (para tratamento específico no frontend, se necessário)

    // Captura o stack trace, excluindo o construtor da própria classe AppError
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;