import mongoose, { Schema, Model } from 'mongoose';
import { IPlaca } from '../types/models';

const placaSchema = new Schema<IPlaca>(
  {
    numero_placa: {
      type: String,
      required: [true, 'Número da placa é obrigatório'],
      trim: true,
      index: true,
    },
    coordenadas: {
      type: String,
      trim: true,
    },
    nomeDaRua: {
      type: String,
      trim: true,
    },
    tamanho: {
      type: String,
      trim: true,
    },
    imagem: {
      type: String,
      trim: true,
    },
    disponivel: {
      type: Boolean,
      default: true,
      index: true,
    },
    regiao: {
      type: Schema.Types.ObjectId,
      ref: 'Regiao',
      required: [true, 'Região é obrigatória'],
      index: true,
    },
    empresa: {
      type: Schema.Types.ObjectId,
      ref: 'Empresa',
      required: [true, 'Empresa é obrigatória'],
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
placaSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Compound index for queries
placaSchema.index({ empresa: 1, disponivel: 1 });
placaSchema.index({ empresa: 1, regiao: 1 });

const Placa: Model<IPlaca> = mongoose.models.Placa || mongoose.model<IPlaca>('Placa', placaSchema);

export default Placa;
