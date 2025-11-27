import mongoose, { Schema, Model } from 'mongoose';
import { IRegiao } from '../types/models';

const regiaoSchema = new Schema<IRegiao>(
  {
    nome: {
      type: String,
      required: [true, 'O nome da região é obrigatório'],
      trim: true,
      maxlength: [100, 'Nome deve ter no máximo 100 caracteres'],
    },
    codigo: {
      type: String,
      required: [true, 'O código da região é obrigatório'],
      trim: true,
      uppercase: true,
    },
    descricao: {
      type: String,
      trim: true,
    },
    ativo: {
      type: Boolean,
      default: true,
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
regiaoSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Compound unique index: nome must be unique per empresa
regiaoSchema.index({ empresa: 1, nome: 1 }, { unique: true });

const Regiao: Model<IRegiao> = mongoose.models.Regiao || mongoose.model<IRegiao>('Regiao', regiaoSchema);

export default Regiao;
