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
    responsavel: {
        type: String,
        trim: true
    },
    segmento: {
        type: String,
        trim: true
    },

    // --- CORREÇÃO ADICIONADA AQUI ---
    // Adiciona a referência à Empresa dona deste cliente.
    empresa: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Empresa', // Deve corresponder ao nome do modelo em Empresa.js
        required: [true, 'O cliente deve pertencer a uma empresa.'],
        index: true // Adiciona um índice para performance
    }
    // --- FIM DA CORREÇÃO ---

}, {
    timestamps: true,
    // Garante que 'id' virtual seja incluído
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual 'id'
clienteSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

const Cliente = mongoose.model('Cliente', clienteSchema);

module.exports = Cliente;

//mudanca total no codigo base
// Mudança total no código base