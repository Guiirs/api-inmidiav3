const mongoose = require('mongoose');
const { Schema } = mongoose;

const empresaSchema = new Schema({
  nome: { type: String, required: true },
  cnpj: { type: String, required: true, unique: true }, // CNPJ deve ser único
  api_key_hash: { type: String, required: true, unique: true }, // Hash da chave
  api_key_prefix: { type: String, required: true, unique: true, index: true }, // Prefixo para busca rápida
  status_assinatura: { type: String, default: 'active' },
  // Timestamps adicionados automaticamente
}, {
  timestamps: true
});

module.exports = mongoose.model('Empresa', empresaSchema);