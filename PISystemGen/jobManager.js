const EventEmitter = require('events');
const generator = require('./generator');
const logger = require('../config/logger');
const storage = require('../services/storage');
const PiGenJob = require('../models/PiGenJob');

const ee = new EventEmitter();

function createJobId() {
  return `job_${Date.now()}_${Math.floor(Math.random()*10000)}`;
}

/**
 * start job and persist to MongoDB (PiGenJob)
 */
async function startJobGeneratePDF(contratoId, empresaId, user, options = {}) {
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
      } catch (e) {
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
    } catch (err) {
      logger.error(`[PISystemGen] job ${jobId} falhou: ${err.message}`);
      try {
        jobDoc.status = 'failed';
        jobDoc.error = err.message;
        jobDoc.updatedAt = new Date();
        await jobDoc.save();
      } catch (saveErr) {
        logger.error('[PISystemGen] erro ao salvar job falhado:', saveErr.message);
      }
      ee.emit('failed', jobId);
    }
  })();

  return jobId;
}

async function getJob(jobId) {
  return PiGenJob.findOne({ jobId }).lean();
}

module.exports = { startJobGeneratePDF, getJob, ee };
