// middlewares/apiKeyAuthMiddleware.js
const bcrypt = require('bcrypt'); // Importa o bcrypt
const Empresa = require('../models/Empresa'); // Importa o modelo Empresa Mongoose

// O middleware já não precisa receber 'db'
module.exports = () => {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ message: 'Chave de API ausente.' });
    }

    // Lógica para separar prefixo e segredo (inalterada)
    const parts = apiKey.split('_');
    if (parts.length < 2) {
      return res.status(403).json({ message: 'Chave de API mal formatada.' });
    }
    const apiKeySecret = parts.pop();
    const apiKeyPrefix = parts.join('_');

    try {
      // 1. Busca a empresa pelo PREFIXO usando Mongoose
      const empresa = await Empresa.findOne({ api_key_prefix: apiKeyPrefix }).exec(); // Busca no MongoDB

      if (!empresa) {
        return res.status(403).json({ message: 'Chave de API inválida (prefixo não encontrado).' });
      }

      // 2. Compara o SEGREDO com o HASH guardado (api_key_hash) usando bcrypt (inalterado)
      const match = await bcrypt.compare(apiKeySecret, empresa.api_key_hash);

      if (!match) {
        return res.status(403).json({ message: 'Chave de API inválida (segredo incorreto).' });
      }

      // 3. Sucesso! Anexa o *documento Mongoose* da empresa ao request
      //    Isso garante que req.empresa._id estará disponível para os controllers/services
      req.empresa = empresa;
      next();
    } catch (err) {
      // Passa erros (ex: falha no DB) para o errorHandler
      console.error("Erro no apiKeyAuthMiddleware:", err); // Log adicional para erros inesperados
      next(err);
    }
  };
};