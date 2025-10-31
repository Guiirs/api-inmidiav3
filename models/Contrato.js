// models/Contrato.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const contratoSchema = new Schema({
    empresa: { type: Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
    cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
    pi: { type: Schema.Types.ObjectId, ref: 'PropostaInterna', required: true, index: true, unique: true },
    
    status: {
        type: String,
        required: true,
        enum: ['rascunho', 'ativo', 'concluido', 'cancelado'],
        default: 'rascunho'
    },
    
    // ... (outros campos, se existirem)
    
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual 'id'
contratoSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

// Popula automaticamente a PI e o Cliente ao buscar
contratoSchema.pre(/^find/, function(next) {
    this.populate('pi').populate('cliente');
    next();
});


module.exports = mongoose.model('Contrato', contratoSchema);