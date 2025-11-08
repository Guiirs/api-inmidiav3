const mongoose = require('mongoose');

const PiGenJobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  contratoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contrato', required: true },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa' },
  status: { type: String, enum: ['queued','running','done','failed'], default: 'queued' },
  resultPath: { type: String },
  resultUrl: { type: String },
  error: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

PiGenJobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.models.PiGenJob || mongoose.model('PiGenJob', PiGenJobSchema);
