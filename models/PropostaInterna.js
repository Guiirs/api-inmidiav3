// models/PropostaInterna.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const { createPeriodSchema } = require('../utils/periodTypes');

const propostaInternaSchema = new Schema({
    empresa: { type: Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
    cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
    
    // [NOVO] Código único de sincronização PI ↔ Aluguéis
    pi_code: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },

    // [PERÍODO UNIFICADO] Campos padronizados de período
    ...createPeriodSchema(),

    // [LEGADO - MANTER PARA COMPATIBILIDADE] Campos antigos
    // Serão removidos em versão futura após migração completa
    tipoPeriodo: { 
        type: String, 
        required: false, // Não mais obrigatório (usa periodType agora)
        enum: ['quinzenal', 'mensal'] 
    },
    dataInicio: { type: Date, required: false }, // Usa startDate agora
    dataFim: { type: Date, required: false }, // Usa endDate agora
    
    valorTotal: { type: Number, required: true },
    descricao: { type: String, required: true, trim: true },    

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

    // --- NOVOS CAMPOS PARA PDF COMPATÍVEL COM XLSX ---
    
    /**
     * Tipo de produto/serviço (Ex: "OUTDOOR", "PAINEL", etc.)
     */
    produto: {
        type: String,
        trim: true,
        default: 'OUTDOOR'
    },

    /**
     * Descrição textual do período (Ex: "BISEMANA 26", "MENSAL - MARÇO/2025")
     */
    descricaoPeriodo: {
        type: String,
        trim: true
    },

    /**
     * Valor específico para produção (separado do valor de veiculação)
     */
    valorProducao: {
        type: Number,
        default: 0
    },
    
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

// [PERÍODO UNIFICADO] Índices para novo sistema
propostaInternaSchema.index({ periodType: 1, empresa: 1 });
propostaInternaSchema.index({ startDate: 1, endDate: 1 });
propostaInternaSchema.index({ biWeekIds: 1 });

// [LEGADO] Índices antigos mantidos para compatibilidade
propostaInternaSchema.index({ dataInicio: 1, dataFim: 1 });

module.exports = mongoose.model('PropostaInterna', propostaInternaSchema);