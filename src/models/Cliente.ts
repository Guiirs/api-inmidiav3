import mongoose, { Schema, Model } from 'mongoose';
import { ICliente } from '../types/models';

const clienteSchema = new Schema<ICliente>(
  {
    nome: {
      type: String,
      required: [true, 'O nome do cliente é obrigatório'],
      trim: true,
      maxlength: [200, 'Nome deve ter no máximo 200 caracteres'],
    },
    cpfCnpj: {
      type: String,
      required: [true, 'CPF/CNPJ é obrigatório'],
      unique: true,
      trim: true,
      index: true,
    },
    telefone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'],
    },
    endereco: {
      type: String,
      trim: true,
    },
    cidade: {
      type: String,
      trim: true,
    },
    estado: {
      type: String,
      trim: true,
      maxlength: [2, 'Estado deve ter 2 caracteres (UF)'],
    },
    cep: {
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
      required: [true, 'O cliente deve pertencer a uma empresa'],
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
clienteSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Compound index for unique cpfCnpj per empresa
clienteSchema.index({ empresa: 1, cpfCnpj: 1 }, { unique: true });

const Cliente: Model<ICliente> = mongoose.models.Cliente || mongoose.model<ICliente>('Cliente', clienteSchema);

export default Cliente;
