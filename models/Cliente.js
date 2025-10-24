const mongoose = require('mongoose');
const { Schema } = mongoose;

const clienteSchema = new Schema({
  nome: { type: String, required: true },
  cnpj: { type: String, sparse: true }, // sparse permite múltiplos nulos mas garante unicidade se preenchido
  telefone: String,
  logo_url: String, // URL do logo (do R2)
    empresa: { type: Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true }, // Adicionado index: true  // Timestamps adicionados automaticamente
}, {
  timestamps: true
});

// Índice composto para garantir CNPJ único por empresa (se não for nulo)
clienteSchema.index({ empresa: 1, cnpj: 1 }, { unique: true, sparse: true }); // Índice unique mantido
module.exports = mongoose.model('Cliente', clienteSchema);