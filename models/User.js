const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true, trim: true, minlength: 3, maxlength: 50 },
  email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { type: String, required: true }, // Min length pode ser validado antes do hash
  nome: { type: String, required: true, trim: true, maxlength: 100 },
  sobrenome: { type: String, required: true, trim: true, maxlength: 100 },
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
  avatar_url: { type: String, trim: true },
  resetToken: String,
  tokenExpiry: Date, // Use Date para expiração
        empresa: { type: Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true }, // Adicionado index: true      // Timestamps adicionados automaticamente
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);