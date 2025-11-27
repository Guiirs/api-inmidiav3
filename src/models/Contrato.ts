import mongoose, { Schema, Model } from 'mongoose';
import { IContrato } from '../types/models';

const contratoSchema = new Schema<IContrato>(
  {
    empresaId: {
      type: Schema.Types.ObjectId,
      ref: 'Empresa',
      required: [true, 'Empresa é obrigatória'],
      index: true,
    },
    clienteId: {
      type: Schema.Types.ObjectId,
      ref: 'Cliente',
      required: [true, 'Cliente é obrigatório'],
      index: true,
    },
    piId: {
      type: Schema.Types.ObjectId,
      ref: 'PropostaInterna',
      required: [true, 'Proposta Interna é obrigatória'],
      index: true,
      unique: true,
    },
    numero: {
      type: String,
      required: [true, 'Número do contrato é obrigatório'],
      trim: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['rascunho', 'ativo', 'concluido', 'cancelado'],
      default: 'rascunho',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual id
contratoSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

const Contrato: Model<IContrato> = mongoose.models.Contrato || mongoose.model<IContrato>('Contrato', contratoSchema);

export default Contrato;
