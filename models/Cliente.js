// models/Cliente.js
const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: [true, 'O nome do cliente é obrigatório.'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'O email do cliente é obrigatório.'],
        unique: true,
        trim: true,
        lowercase: true
    },
    telefone: {
        type: String,
        trim: true
    },
    cnpj: {
        type: String,
        trim: true,
        unique: true,
        // Adicionar validação de CNPJ se necessário
    },
    endereco: {
        type: String,
        trim: true
    },
    bairro: {
        type: String,
        trim: true
    },
    cidade: {
        type: String,
        trim: true
    },
    // --- CAMPO NOVO ADICIONADO ---
    // Responsável pelo contrato (conforme imagem de referência)
    responsavel: {
        type: String,
        trim: true
    },
    // --- CAMPO NOVO ADICIONADO ---
    // Segmento do cliente (escolas, lojas, etc.)
    segmento: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    // Garante que 'id' virtual seja incluído, mesmo que não estejamos usando .lean()
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual 'id'
clienteSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

const Cliente = mongoose.model('Cliente', clienteSchema);

module.exports = Cliente;