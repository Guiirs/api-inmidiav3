#!/usr/bin/env node
/**
 * Test script for PISystemGen
 * Usage:
 *   node scripts/tests/test_pi_gen.js <contratoId> <empresaId> [background]
 *
 * The script will start a job via the job manager and poll until completion.
 */

const connectDB = require('../../config/dbMongo');
const jobManager = require('../../PISystemGen/jobManager');
require('dotenv').config();

// Ensure DB connection
let dbConnected = false;
async function ensureDb() {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
}
const path = require('path');

async function runTest(contratoId, empresaId, background = true) {
  if (!contratoId) {
    throw new Error('Usage: node scripts/tests/test_pi_gen.js <contratoId> [empresaId] [background]');
  }
  // allow empresaId to be optional (pass null to generator)
  if (!empresaId) empresaId = null;

  console.log('Starting PISystemGen job for contrato:', contratoId, 'empresa:', empresaId, 'background:', background);
  await ensureDb();
  const jobId = await jobManager.startJobGeneratePDF(contratoId, empresaId || null, null);
  console.log('Job started:', jobId);

  if (background) {
    console.log('Background mode: returning immediately. Poll status with GET /api/v1/pi-gen/status/' + jobId);
    return { jobId };
  }

  const timeoutMs = 5 * 60 * 1000; // 5 minutes
  const pollInterval = 2000;
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      const elapsed = Date.now() - start;
      if (elapsed > timeoutMs) {
        clearInterval(interval);
        return reject(new Error('Timeout waiting for job completion'));
      }

      let job;
      try {
        job = await jobManager.getJob(jobId);
      } catch (e) {
        // transient DB error, skip this tick
        console.warn('Warning reading job status:', e.message);
        return;
      }
      if (!job) return; // continue

      console.log('Status:', job.status);
      if (job.status === 'done') {
        clearInterval(interval);
        console.log('Job done. Result path:', job.resultPath, 'resultUrl:', job.resultUrl);
        return resolve(job.resultPath || job.resultUrl);
      }
      if (job.status === 'failed') {
        clearInterval(interval);
        return reject(new Error('Job failed: ' + job.error));
      }
    }, pollInterval);
  });
}

module.exports = { runTest };

if (require.main === module) {
  const contratoId = process.argv[2];
  const empresaId = process.argv[3];
  const background = process.argv[4] !== 'false';

  runTest(contratoId, empresaId, background)
    .then(result => {
      if (result) console.log('Result:', result);
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}
