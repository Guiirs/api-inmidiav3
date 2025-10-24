const mongoose = require('mongoose');
const { Schema } = mongoose;

const regiaoSchema = new Schema({
  nome: { type: String, required: true },
  empresa: { type: Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true }, // Referência à Empresa
  // Não precisa de timestamps se não forem necessários
});

// Índice composto para garantir nome único por empresa
regiaoSchema.index({ empresa: 1, nome: 1 }, { unique: true });

module.exports = mongoose.model('Regiao', regiaoSchema);