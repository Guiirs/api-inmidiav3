// models/Aluguel.js
const mongoose = require('mongoose');

const AluguelSchema = new mongoose.Schema({
    placa_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Placa',
        required: [true, 'A placa é obrigatória.'],
    },
    cliente_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente',
        required: [true, 'O cliente é obrigatório.'],
    },
    empresa_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Empresa',
        required: [true, 'A empresa é obrigatória.'],
    },
    dataInicio: {
        type: Date,
        required: [true, 'A data de início é obrigatória.'],
    },
    dataFim: {
        type: Date,
        required: [true, 'A data de fim é obrigatória.'],
    },
    valorTotal: {
        type: Number,
        required: [true, 'O valor total é obrigatório.'],
    },
    // Adicionado timestamps para termos createdAt e updatedAt
}, { timestamps: true }); 

// ⚙️ MELHORIA DE PERFORMANCE: Adiciona um índice composto
// Isto torna as consultas de relatórios (filtrando por empresa e data) muito mais rápidas.
AluguelSchema.index({ empresa_id: 1, createdAt: -1 });

module.exports = mongoose.model('Aluguel', AluguelSchema);