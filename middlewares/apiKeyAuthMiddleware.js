// middlewares/apiKeyAuthMiddleware.js
const bcrypt = require('bcrypt'); // Importa o bcrypt

// O middleware é uma função que recebe a instância do 'db'
module.exports = (db) => {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ message: 'Chave de API ausente.' });
    }

    // Divide a chave em prefixo e segredo (ex: "emp_1234_segredo-uuid-longo")
    // O prefixo pode conter underscores, então pegamos a primeira e o resto
    const parts = apiKey.split('_');
    if (parts.length < 2) { // Deve ter pelo menos prefixo_segredo
      return res.status(403).json({ message: 'Chave de API mal formatada.' });
    }

    // Recria o prefixo (caso ele mesmo contenha underscores) e o segredo
    const apiKeySecret = parts.pop(); // O último elemento é sempre o segredo
    const apiKeyPrefix = parts.join('_'); // O resto é o prefixo

    try {
      // 1. Busca a empresa pelo PREFIXO (rápido e indexado)
      // Usamos api_key_prefix (conforme definido na migration)
      const empresa = await db('empresas').where({ api_key_prefix: apiKeyPrefix }).first();

      if (!empresa) {
        return res.status(403).json({ message: 'Chave de API inválida (prefixo não encontrado).' });
      }

      // 2. Compara o SEGREDO com o HASH guardado (api_key_hash)
      const match = await bcrypt.compare(apiKeySecret, empresa.api_key_hash);

      if (!match) {
        return res.status(403).json({ message: 'Chave de API inválida (segredo incorreto).' });
      }

      // 3. Sucesso! Anexa a empresa ao request
      req.empresa = empresa;
      next();
    } catch (err) {
      // Passa erros (ex: falha no DB) para o errorHandler
      next(err);
    }
  };
};