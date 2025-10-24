const mongoose = require('mongoose');
const { Schema } = mongoose;

const aluguelSchema = new Schema({
  data_inicio: { type: Date, required: true },
  data_fim: { type: Date, required: true },
  placa: { type: Schema.Types.ObjectId, ref: 'Placa', required: true, index: true }, // Referência à Placa
  cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true }, // Referência ao Cliente
  empresa: { type: Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true }, // Referência à Empresa
  // Timestamps adicionados automaticamente
}, {
  timestamps: true
});

// Pode ser útil indexar por placa e datas para verificar conflitos rapidamente
aluguelSchema.index({ placa: 1, data_inicio: 1, data_fim: 1 });

module.exports = mongoose.model('Aluguel', aluguelSchema);