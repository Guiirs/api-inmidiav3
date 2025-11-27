// @ts-nocheck
import { EventEmitter } from 'events';
import generator from './generator';
import logger from '../config/logger';
import storage from '../services/storage';
import PiGenJob from '../models/PiGenJob';

const ee = new EventEmitter();

function createJobId(): string {
  return `job_${Date.now()}_${Math.floor(Math.random()*10000)}`;
}

/**
 * start job and persist to MongoDB (PiGenJob)
 */
async function startJobGeneratePDF(contratoId: string, empresaId: string, user: any, options: any = {}) {
  const jobId = createJobId();

  // create job document
  const jobDoc = new PiGenJob({
    jobId,
    type: 'generate_pdf',
    contratoId,
    empresaId: empresaId || null,
    status: 'queued'
  });
  await jobDoc.save();

  (async () => {
    try {
      jobDoc.status = 'running';
      jobDoc.updatedAt = new Date();
      await jobDoc.save();

      const buffer = await generator.generatePDFBufferFromContrato(contratoId, empresaId, user, options);

      // Save temp locally first
      const localPath = await generator.saveBufferToTemp(buffer, 'pdf');

      // Upload to storage (S3 or local fallback)
      const key = `pigen/${jobId}.pdf`;
      let uploadResult;
      try {
        uploadResult = await storage.uploadFilePath(localPath, key, 'application/pdf');
      } catch (e: any) {
        logger.warn('[PISystemGen] upload failure, keeping local file:', e.message);
        uploadResult = { url: null, key: localPath };
      }

      jobDoc.status = 'done';
      jobDoc.resultPath = localPath;
      jobDoc.resultUrl = uploadResult.url || null;
      jobDoc.updatedAt = new Date();
      await jobDoc.save();

      ee.emit('done', jobId);
      logger.info(`[PISystemGen] job ${jobId} concluído: ${localPath}`);
    } catch (err: any) {
      logger.error(`[PISystemGen] job ${jobId} falhou: ${err.message}`);
      try {
        jobDoc.status = 'failed';
        jobDoc.error = err.message;
        jobDoc.updatedAt = new Date();
        await jobDoc.save();
      } catch (saveErr: any) {
        logger.error('[PISystemGen] erro ao salvar job falhado:', saveErr.message);
      }
      ee.emit('failed', jobId);
    }
  })();

  return jobId;
}

async function getJob(jobId: string) {
  return PiGenJob.findOne({ jobId }).lean();
}

export default { startJobGeneratePDF, getJob, ee };
