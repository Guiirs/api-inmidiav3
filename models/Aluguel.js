// models/Aluguel.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

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
    // [CORREÇÃO] Campo renomeado de 'dataInicio' para 'data_inicio'
    data_inicio: {
        type: Date,
        required: [true, 'A data de início é obrigatória.'],
    },
    // [CORREÇÃO] Campo renomeado de 'dataFim' para 'data_fim'
    data_fim: {
        type: Date,
        required: [true, 'A data de fim é obrigatória.'],
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

// [MELHORIA] Índice composto para otimizar a verificação de conflitos de datas
AluguelSchema.index({ placa: 1, data_inicio: 1, data_fim: 1 });

// [MELHORIA] Índice composto para relatórios (o original estava em empresa_id e createdAt)
// Este é mais útil para buscar aluguéis que estão terminando.
AluguelSchema.index({ empresa: 1, data_fim: 1 });

// [NOVO] Índice composto para sincronização PI ↔ Aluguéis
AluguelSchema.index({ pi_code: 1, proposta_interna: 1 });
AluguelSchema.index({ tipo: 1, empresa: 1 });

module.exports = mongoose.model('Aluguel', AluguelSchema);