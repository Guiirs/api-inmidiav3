// models/Empresa.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const crypto = require('crypto');

const empresaSchema = new Schema({
    nome: {
        type: String,
        required: [true, 'O nome da empresa é obrigatório.'],
        trim: true
    },
    cnpj: {
        type: String,
        required: [true, 'O CNPJ é obrigatório.'],
        unique: true,
        trim: true
    },
    
    // --- CAMPOS NOVOS ADICIONADOS ---
    // (Necessários para o layout do CONTRATO.pdf)
    
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
    telefone: {
        type: String,
        trim: true
    },
    
    // ---------------------------------
    
    apiKey: {
        type: String,
        unique: true
    },
    // Referência aos usuários que pertencem a esta empresa
    usuarios: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual 'id'
empresaSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

// Hook para gerar apiKey antes de salvar (se não existir)
empresaSchema.pre('save', function(next) {
    if (!this.apiKey) {
        this.apiKey = crypto.randomBytes(20).toString('hex');
    }
    next();
});

// Método para (re)gerar a apiKey
empresaSchema.methods.generateApiKey = function() {
    this.apiKey = crypto.randomBytes(20).toString('hex');
    return this.apiKey;
};


module.exports = mongoose.model('Empresa', empresaSchema);