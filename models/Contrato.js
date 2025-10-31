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
    
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

contratoSchema.virtual('id').get(function() {
    return this._id.toHexString();
});


module.exports = mongoose.model('Contrato', contratoSchema);