import mongoose, { Schema, Model } from 'mongoose';
import { IPropostaInterna } from '../types/models';
import { createPeriodSchema } from '../utils/periodTypes';

const propostaInternaSchema = new Schema<IPropostaInterna>(
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
    pi_code: {
      type: String,
      required: [true, 'Código PI é obrigatório'],
      unique: true,
      index: true,
    },
    // Unified period fields
    ...createPeriodSchema(),
    // Legacy fields for compatibility
    tipoPeriodo: {
      type: String,
      required: false,
      enum: ['quinzenal', 'mensal'],
    },
    dataInicio: {
      type: Date,
      required: false,
    },
    dataFim: {
      type: Date,
      required: false,
    },
    valorTotal: {
      type: Number,
      required: [true, 'Valor total é obrigatório'],
      min: [0, 'Valor total deve ser maior ou igual a zero'],
    },
    valorProducao: {
      type: Number,
      default: 0,
      min: [0, 'Valor de produção deve ser maior ou igual a zero'],
    },
    descricao: {
      type: String,
      required: [true, 'Descrição é obrigatória'],
      trim: true,
      maxlength: [1000, 'Descrição deve ter no máximo 1000 caracteres'],
    },
    descricaoPeriodo: {
      type: String,
      trim: true,
    },
    produto: {
      type: String,
      trim: true,
      default: 'OUTDOOR',
    },
    placas: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Placa',
      },
    ],
    formaPagamento: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['em_andamento', 'concluida', 'vencida'],
      default: 'em_andamento',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for unified period system
propostaInternaSchema.index({ periodType: 1, empresaId: 1 });
propostaInternaSchema.index({ startDate: 1, endDate: 1 });
propostaInternaSchema.index({ biWeekIds: 1 });

// Legacy indexes
propostaInternaSchema.index({ dataInicio: 1, dataFim: 1 });

// Virtual id
propostaInternaSchema.virtual('id').get(function (this: any) {
  return this._id.toHexString();
});

const PropostaInterna: Model<IPropostaInterna> = mongoose.models.PropostaInterna || mongoose.model<IPropostaInterna>(
  'PropostaInterna',
  propostaInternaSchema
);

export default PropostaInterna;
