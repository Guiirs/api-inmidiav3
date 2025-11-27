import mongoose, { Schema, Model } from 'mongoose';
import { IAluguel } from '../types/models';
import { createPeriodSchema } from '../utils/periodTypes';

const aluguelSchema = new Schema<IAluguel>(
  {
    placaId: {
      type: Schema.Types.ObjectId,
      ref: 'Placa',
      required: [true, 'A placa é obrigatória'],
      index: true,
    },
    clienteId: {
      type: Schema.Types.ObjectId,
      ref: 'Cliente',
      required: [true, 'O cliente é obrigatório'],
      index: true,
    },
    empresaId: {
      type: Schema.Types.ObjectId,
      ref: 'Empresa',
      required: [true, 'A empresa é obrigatória'],
      index: true,
    },
    // Unified period fields
    ...createPeriodSchema(),
    // Legacy fields for compatibility
    bi_week_ids: [
      {
        type: String,
        sparse: true,
      },
    ],
    data_inicio: {
      type: Date,
      required: false,
    },
    data_fim: {
      type: Date,
      required: false,
    },
    // PI integration
    pi_code: {
      type: String,
      required: false,
      index: true,
      sparse: true,
    },
    proposta_interna: {
      type: Schema.Types.ObjectId,
      ref: 'PropostaInterna',
      required: false,
      index: true,
      sparse: true,
    },
    tipo: {
      type: String,
      enum: ['manual', 'pi'],
      default: 'manual',
      index: true,
    },
    status: {
      type: String,
      enum: ['ativo', 'finalizado', 'cancelado'],
      default: 'ativo',
      index: true,
    },
    observacoes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for unified period system
aluguelSchema.index({ placaId: 1, startDate: 1, endDate: 1 });
aluguelSchema.index({ empresaId: 1, endDate: 1 });
aluguelSchema.index({ periodType: 1, empresaId: 1 });
aluguelSchema.index({ biWeekIds: 1, empresaId: 1 });

// Legacy indexes
aluguelSchema.index({ placaId: 1, data_inicio: 1, data_fim: 1 });
aluguelSchema.index({ empresaId: 1, data_fim: 1 });
aluguelSchema.index({ bi_week_ids: 1, empresaId: 1 });

// Virtual id
aluguelSchema.virtual('id').get(function (this: any) {
  return this._id.toHexString();
});

const Aluguel: Model<IAluguel> = mongoose.models.Aluguel || mongoose.model<IAluguel>('Aluguel', aluguelSchema);

export default Aluguel;
