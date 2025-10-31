// models/Contrato.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const contratoSchema = new Schema({
    // Vinculado diretamente à PI
    pi: { type: Schema.Types.ObjectId, ref: 'PropostaInterna', required: true, unique: true },
    empresa: { type: Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
    cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
    
    // Armazena qual template de PDF foi usado (para versionamento)
    templateUsado: { type: String, default: 'default_v1' },
    
    // Dados de assinatura (se aplicável, ex: integração com Docusign)
    dadosAssinatura: { type: Object },
    
    status: { 
        type: String, 
        required: true, 
        enum: ['rascunho', 'enviado', 'assinado'], 
        default: 'rascunho' 
    }
}, {
  timestamps: true
});

module.exports = mongoose.model('Contrato', contratoSchema);