const mongoose = require('mongoose');
const { Schema } = mongoose;

const placaSchema = new Schema({
  // id_placa não é mais necessário, MongoDB usa _id
  numero_placa: { type: String, required: true },
  coordenadas: String,
  nomeDaRua: String,
  tamanho: String,
  imagem: String, // URL da imagem (do R2)
  disponivel: { type: Boolean, default: true },
  regiao: { type: Schema.Types.ObjectId, ref: 'Regiao', index: true }, // Referência opcional à Regiao (pode ser null se a região for apagada)
  empresa: { type: Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true }, // Referência à Empresa
  // Timestamps adicionados automaticamente
}, {
  timestamps: true
});

// Índice composto para garantir numero_placa único por empresa e região (se região existir)
// Atenção: MongoDB trata `null` como um valor único em índices unique sparse.
// Se precisar permitir múltiplos `null` em regiao, pode precisar de abordagem diferente ou não usar unique index aqui.
// Por simplicidade, vamos manter assim, assumindo que regiao_id era obrigatório no SQL.
placaSchema.index({ empresa: 1, regiao: 1, numero_placa: 1 }, { unique: true });

module.exports = mongoose.model('Placa', placaSchema);