import mongoose, { Schema, Model } from 'mongoose';
import { IBiWeek } from '../types/models';

const biWeekSchema = new Schema<IBiWeek>(
  {
    bi_week_id: {
      type: String,
      required: [true, 'O ID da Bi-Semana é obrigatório'],
      unique: true,
      index: true,
      trim: true,
      match: [
        /^\d{4}-\d{2}$/,
        'Formato de bi_week_id inválido. Use YYYY-NN (ex: 2026-02)',
      ],
    },
    ano: {
      type: Number,
      required: [true, 'O ano é obrigatório'],
      index: true,
      min: [2020, 'O ano deve ser 2020 ou posterior'],
      max: [2100, 'Ano inválido'],
    },
    numero: {
      type: Number,
      required: [true, 'O número da Bi-Semana é obrigatório'],
      min: [2, 'O número da Bi-Semana deve ser entre 2 e 52'],
      max: [52, 'O número da Bi-Semana deve ser entre 2 e 52'],
      validate: {
        validator: function (v: number) {
          return v % 2 === 0;
        },
        message: 'O número da bi-semana deve ser par (02, 04, 06... 52)',
      },
    },
    dataInicio: {
      type: Date,
      required: [true, 'A data de início é obrigatória'],
      index: true,
    },
    dataFim: {
      type: Date,
      required: [true, 'A data de término é obrigatória'],
      index: true,
    },
    descricao: {
      type: String,
      trim: true,
      maxlength: [200, 'A descrição não pode ter mais de 200 caracteres'],
    },
    ativo: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
biWeekSchema.index({ ano: 1, numero: 1 }, { unique: true });
biWeekSchema.index({ dataInicio: 1, dataFim: 1 });

// Virtual id
biWeekSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Pre-save validation
biWeekSchema.pre('save', function (next) {
  if (this.dataFim <= this.dataInicio) {
    return next(new Error('A data de término deve ser posterior à data de início'));
  }

  const diffMs = this.dataFim.getTime() - this.dataInicio.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays < 12 || diffDays > 16) {
    return next(
      new Error(`Uma Bi-Semana deve ter aproximadamente 14 dias. Período atual: ${diffDays} dias`)
    );
  }

  next();
});

// Static methods
biWeekSchema.statics.findByDate = function (date: Date) {
  return this.findOne({
    dataInicio: { $lte: date },
    dataFim: { $gte: date },
    ativo: true,
  }).exec();
};

biWeekSchema.statics.findByYear = function (year: number) {
  return this.find({ ano: year, ativo: true }).sort({ numero: 1 }).exec();
};

biWeekSchema.statics.generateCalendar = function (year: number, customStartDate: Date | null = null) {
  const biWeeks: any[] = [];

  let startOfYear: Date;
  if (customStartDate) {
    startOfYear = new Date(customStartDate);
    startOfYear.setUTCHours(0, 0, 0, 0);
  } else {
    startOfYear = new Date(Date.UTC(year, 0, 1));
  }

  for (let i = 0; i < 26; i++) {
    const startDate = new Date(startOfYear);
    startDate.setUTCDate(startOfYear.getUTCDate() + i * 14);

    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 13);
    endDate.setUTCHours(23, 59, 59, 999);

    const numero = (i + 1) * 2;
    const bi_week_id = `${year}-${String(numero).padStart(2, '0')}`;

    biWeeks.push({
      bi_week_id,
      ano: year,
      numero,
      dataInicio: startDate,
      dataFim: endDate,
      descricao: `Bi-Semana ${numero} de ${year}`,
      ativo: true,
    });
  }

  return biWeeks;
};

// Instance methods
biWeekSchema.methods.getFormattedPeriod = function (): string {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  const start = this.dataInicio.toLocaleDateString('pt-BR', options);
  const end = this.dataFim.toLocaleDateString('pt-BR', options);
  return `${start} até ${end}`;
};

const BiWeek: Model<IBiWeek> = mongoose.models.BiWeek || mongoose.model<IBiWeek>('BiWeek', biWeekSchema);

export default BiWeek;
