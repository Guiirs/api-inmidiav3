// jest.config.js
module.exports = {
  // Indica ao Jest para executar o setup antes dos testes
  setupFilesAfterEnv: ['<rootDir>/config/jest.setup.js'],
  // Define o ambiente de teste (Node é o padrão, mas explícito é bom)
  testEnvironment: 'node',
  // Aumenta o timeout padrão se as conexões demorarem
  testTimeout: 15000, // Ex: 15 segundos
};