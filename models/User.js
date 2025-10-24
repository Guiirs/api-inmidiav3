const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true }, // Armazenará o hash
  nome: { type: String, required: true },
  sobrenome: { type: String, required: true },
  role: { type: String, default: 'user', enum: ['user', 'admin'] }, // Define papéis permitidos
  avatar_url: String,
  resetToken: String,
  tokenExpiry: Date, // Use Date para expiração
  empresa: { type: Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true }, // Referência à Empresa
  // Timestamps adicionados automaticamente
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);