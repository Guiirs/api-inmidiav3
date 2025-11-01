// utils/validators.js

/**
 * Valida um número de CNPJ.
 * @param {string} cnpj - O CNPJ para validar (pode conter pontos, barras e traços).
 * @returns {boolean} - Retorna true se o CNPJ for válido, false caso contrário.
 */
function validarCNPJ(cnpj) {
  if (!cnpj) return false;

  // Remove caracteres especiais
  const cnpjLimpo = cnpj.replace(/[^\d]+/g, '');

  // Verifica se tem 14 dígitos
  if (cnpjLimpo.length !== 14) return false;

  // Elimina CNPJs inválidos conhecidos (todos os dígitos iguais)
  if (/^(\d)\1+$/.test(cnpjLimpo)) return false;

  // Validação dos dígitos verificadores
  let tamanho = cnpjLimpo.length - 2;
  let numeros = cnpjLimpo.substring(0, tamanho);
  let digitos = cnpjLimpo.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != digitos.charAt(0)) return false;

  tamanho = tamanho + 1;
  numeros = cnpjLimpo.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != digitos.charAt(1)) return false;

  return true;
}

module.exports = { validarCNPJ };