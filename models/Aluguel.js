// models/Aluguel.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const { createPeriodSchema } = require('../utils/periodTypes');

const AluguelSchema = new Schema({
    // [CORREÇÃO] Campo renomeado de 'placa_id' para 'placa'
    // 'ref' se refere ao nome do modelo 'Placa' (do models/Placa.js)
    placa: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Placa',
        required: [true, 'A placa é obrigatória.'],
        index: true, // Adicionado índice para performance
    },
    // [CORREÇÃO] Campo renomeado de 'cliente_id' para 'cliente'
    cliente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente',
        required: [true, 'O cliente é obrigatório.'],
        index: true, // Adicionado índice para performance
    },
    // [CORREÇÃO] Campo renomeado de 'empresa_id' para 'empresa'
    empresa: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Empresa',
        required: [true, 'A empresa é obrigatória.'],
        index: true,
    },

    // [PERÍODO UNIFICADO] Campos padronizados de período
    ...createPeriodSchema(),

    // [LEGADO - MANTER PARA COMPATIBILIDADE] Campos antigos
    // Serão removidos em versão futura após migração completa
    // [LEGADO] Campos antigos - removido index inline para evitar duplicação
    bi_week_ids: [{
        type: String,
        sparse: true
    }],
    bi_weeks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BiWeek',
        sparse: true
    }],
    data_inicio: {
        type: Date,
        required: false, // Não mais obrigatório (usa startDate agora)
    },
    data_fim: {
        type: Date,
        required: false, // Não mais obrigatório (usa endDate agora)
    },
    // [NOVO] Código de vinculação com PI - UUID único para garantir sincronização
    pi_code: {
        type: String,
        required: false, // Opcional para aluguéis manuais (não criados por PI)
        index: true,
        sparse: true, // Permite NULL mas indexa os que existem
    },
    // [NOVO] Referência direta à PI (se criado por PI)
    proposta_interna: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PropostaInterna',
        required: false,
        index: true,
        sparse: true,
    },
    // [NOVO] Flag para identificar se é aluguel manual ou criado por PI
    tipo: {
        type: String,
        enum: ['manual', 'pi'],
        default: 'manual',
        index: true,
    },
}, { timestamps: true });

// [PERÍODO UNIFICADO] Índices para novo sistema
AluguelSchema.index({ placa: 1, startDate: 1, endDate: 1 });
AluguelSchema.index({ empresa: 1, endDate: 1 });
AluguelSchema.index({ periodType: 1, empresa: 1 });
AluguelSchema.index({ biWeekIds: 1, empresa: 1 });

// [LEGADO] Índices antigos mantidos para compatibilidade
AluguelSchema.index({ placa: 1, data_inicio: 1, data_fim: 1 });
AluguelSchema.index({ empresa: 1, data_fim: 1 });
AluguelSchema.index({ bi_week_ids: 1, empresa: 1 });
AluguelSchema.index({ bi_weeks: 1 });

module.exports = mongoose.model('Aluguel', AluguelSchema);