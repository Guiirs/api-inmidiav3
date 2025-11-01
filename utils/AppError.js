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
   */
  constructor(message, statusCode) {
    super(message); // Chama o construtor da classe Error pai

    this.statusCode = statusCode;
    // Define o status com base no statusCode (fail para 4xx, error para 5xx)
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    // [MELHORIA] Marca este erro como operacional (erro esperado da aplicação).
    // Isso é crucial para o errorHandler global saber o que mostrar ao cliente
    // em produção, e o que esconder (bugs).
    this.isOperational = true;

    // [MELHORIA] Removemos os campos 'field' e 'errorCode' do construtor
    // original para simplificar, 
    // já que não estavam sendo usados consistentemente.
    // Propriedades customizadas (como 'validationErrors') podem ser
    // adicionadas dinamicamente à instância do erro, se necessário,
    // como já é feito no authValidator.js.

    // Captura o stack trace, excluindo o construtor da própria classe AppError
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;