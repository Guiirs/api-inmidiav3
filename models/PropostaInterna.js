// models/PropostaInterna.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const propostaInternaSchema = new Schema({
    empresa: { type: Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
    cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
    
    tipoPeriodo: { 
        type: String, 
        required: true, 
        enum: ['quinzenal', 'mensal'] 
    },
    dataInicio: { type: Date, required: true },
    dataFim: { type: Date, required: true },
    
    valorTotal: { type: Number, required: true },
    descricao: { type: String, required: true, trim: true },    
    // --- CAMPOS NOVOS ADICIONADOS ---

    /**
     * Array de IDs de Placas que fazem parte desta PI.
     * Fazemos referência ao model 'Placa'.
     */
    placas: [{
        type: Schema.Types.ObjectId,
        ref: 'Placa'
    }],

    /**
     * Campo de texto para as condições de pagamento.
     * Ex: "30/60/90", "Ato, 30 dias", "PIX", etc.
     */
    formaPagamento: {
        type: String,
        trim: true
    },

    // ---------------------------------
    
    status: { 
        type: String, 
        required: true, 
        enum: ['em_andamento', 'concluida', 'vencida'], 
        default: 'em_andamento',
        index: true
    }
}, {
  timestamps: true
});

module.exports = mongoose.model('PropostaInterna', propostaInternaSchema);