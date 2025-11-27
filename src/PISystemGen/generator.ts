// @ts-nocheck
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { v4 as uuid } from 'uuid';
import Contrato from '../models/Contrato';
import logger from '../config/logger';
import * as PdfService from '../services/pdfService';
import PiGenJob from '../models/PiGenJob';

async function generateExcelBufferFromContrato(contratoId: string, empresaId: string, user: any) {
  throw new Error('Excel generation has been removed. System will be reimplemented in the future.');
}

async function generatePDFBufferFromContrato(contratoId: string, empresaId: string, user: any, options: any = {}) {
  const contrato = await Contrato.findOne({ _id: contratoId, empresa: empresaId })
    .populate('empresa')
    .populate({ path: 'pi', populate: { path: 'cliente' } })
    .lean();
  if (!contrato) throw new Error('Contrato não encontrado');
  
  const pi = contrato.pi;
  const cliente = contrato.pi?.cliente;
  const empresa = contrato.empresa;
  const userFallback = user || { nome: 'Atendimento' };

  const buffer = await PdfService.generateContratoPDF(pi, cliente, empresa, userFallback, options);
  return buffer;
}

async function queueJob(type: string, contratoId: string, empresaId: string, user: any, options: any = {}) {
  const jobId = uuid();
  const job = new PiGenJob({ jobId, type, contratoId, empresaId, status: 'queued' });
  await job.save();
  logger.info(`[PIGen] Job ${jobId} queued for contrato ${contratoId}`);
  
  // Process immediately in background
  setImmediate(async () => {
    try {
      job.status = 'running';
      await job.save();
      
      let buffer;
      if (type === 'excel') {
        buffer = await generateExcelBufferFromContrato(contratoId, empresaId, user);
      } else if (type === 'pdf') {
        buffer = await generatePDFBufferFromContrato(contratoId, empresaId, user, options);
      }
      
      // Save file logic here
      job.status = 'done';
      await job.save();
      logger.info(`[PIGen] Job ${jobId} completed`);
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      await job.save();
      logger.error(`[PIGen] Job ${jobId} failed: ${error.message}`);
    }
  });
  
  return jobId;
}

export default {
  generateExcelBufferFromContrato,
  generatePDFBufferFromContrato,
  queueJob
};
