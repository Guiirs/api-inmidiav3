const mongoose = require('mongoose');
const { Schema } = mongoose;

const aluguelSchema = new Schema({
  data_inicio: { type: Date, required: true },
  data_fim: { type: Date, required: true },
    placa: { type: Schema.Types.ObjectId, ref: 'Placa', required: true, index: true }, // Adicionado index: true
    cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true }, // Adicionado index: true
    empresa: { type: Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true }, // Adicionado index: true
  // Timestamps adicionados automaticamente
}, {
  timestamps: true
});

// Pode ser útil indexar por placa e datas para verificar conflitos rapidamente
aluguelSchema.index({ placa: 1, data_inicio: 1, data_fim: 1 }); // Índice de conflito mantido
module.exports = mongoose.model('Aluguel', aluguelSchema);