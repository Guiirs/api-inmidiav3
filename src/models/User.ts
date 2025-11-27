import mongoose, { Schema, Model } from 'mongoose';
import { IUser } from '../types/models';
import bcrypt from 'bcryptjs';

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username é obrigatório'],
      unique: true,
      index: true,
      trim: true,
      minlength: [3, 'Username deve ter pelo menos 3 caracteres'],
      maxlength: [50, 'Username deve ter no máximo 50 caracteres'],
    },
    email: {
      type: String,
      required: [true, 'Email é obrigatório'],
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'],
    },
    senha: {
      type: String,
      required: [true, 'Senha é obrigatória'],
      minlength: [6, 'Senha deve ter pelo menos 6 caracteres'],
    },
    nome: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
      maxlength: [100, 'Nome deve ter no máximo 100 caracteres'],
    },
    telefone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      default: 'user',
      enum: {
        values: ['user', 'admin', 'superadmin'],
        message: '{VALUE} não é uma role válida',
      },
    },
    ativo: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    resetToken: String,
    tokenExpiry: Date,
    empresaId: {
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

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('senha')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.senha = await bcrypt.hash(this.senha, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.senha);
};

// Virtual id
userSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
