const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const uuid = require('uuid').v4;
const ExcelService = require('../services/excelServiceV2');
const Contrato = require('../models/Contrato');
const logger = require('../config/logger');

async function generateExcelBufferFromContrato(contratoId, empresaId, user) {
  // Fetch contrato and call excel service
  const filter = { _id: contratoId };
  if (empresaId) filter.empresa = empresaId;
  const contrato = await Contrato.findOne(filter)
    .populate('empresa')
    .populate({ path: 'pi', populate: { path: 'cliente' } })
    .lean();
  if (!contrato) throw new Error('Contrato não encontrado');
  const pi = contrato.pi;
  const cliente = contrato.pi?.cliente;
  const empresa = contrato.empresa;
  const userFallback = user || { nome: 'Atendimento' };

  const buffer = await ExcelService.generateContratoExcel(pi, cliente, empresa, userFallback);
  return buffer;
}

async function generatePDFBufferFromContrato(contratoId, empresaId, user, options = {}) {
  const contrato = await Contrato.findOne({ _id: contratoId, empresa: empresaId })
    .populate('empresa')
    .populate({ path: 'pi', populate: { path: 'cliente' } })
    .lean();
  if (!contrato) throw new Error('Contrato não encontrado');
  const pi = contrato.pi;
  const cliente = contrato.pi?.cliente;
  const empresa = contrato.empresa;
  const userFallback = user || { nome: 'Atendimento' };

  // ExcelService has generateContratoPDF(pi, cliente, empresa, user) which returns PDF buffer
  // It internally calls convertExcelToPDF with timeout support
  const buffer = await ExcelService.generateContratoPDF(pi, cliente, empresa, userFallback, options);
  return buffer;
}

async function saveBufferToTemp(buffer, ext = 'pdf') {
  const dir = path.join(__dirname);
  const tmpDir = path.join(dir, 'tmp');
  if (!fsSync.existsSync(tmpDir)) await fs.mkdir(tmpDir, { recursive: true });
  const filename = `${uuid()}.${ext}`;
  const fullpath = path.join(tmpDir, filename);
  await fs.writeFile(fullpath, buffer);
  return fullpath;
}

module.exports = {
  generateExcelBufferFromContrato,
  generatePDFBufferFromContrato,
  saveBufferToTemp
};
