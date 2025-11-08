const jobManager = require('./jobManager');
const logger = require('../config/logger');

// Controller functions for express routes
async function postGenerate(req, res, next) {
  try {
    const { contratoId, background = true } = req.body;
    const empresaId = req.user.empresaId;
    const user = req.user || null;

    if (!contratoId) return res.status(400).json({ error: 'contratoId is required' });

    const jobId = await jobManager.startJobGeneratePDF(contratoId, empresaId, user);

    if (background) {
      return res.status(202).json({ ok: true, jobId });
    }

    // If foreground, wait until job finishes
    const checkFinished = () => new Promise((resolve) => {
      const handler = (id) => {
        if (id !== jobId) return;
        jobManager.ee.removeListener('done', handler);
        jobManager.ee.removeListener('failed', handler);
        resolve();
      };
      jobManager.ee.on('done', handler);
      jobManager.ee.on('failed', handler);
    });

    await checkFinished();
    const job = await jobManager.getJob(jobId);
    if (job && job.status === 'done') {
      if (job.resultPath) return res.sendFile(job.resultPath);
      // If uploaded and has URL, redirect to URL
      if (job.resultUrl) return res.redirect(job.resultUrl);
      return res.status(500).json({ ok: false, error: 'result missing' });
    }
    return res.status(500).json({ ok: false, error: job?.error || 'unknown' });

  } catch (err) {
    next(err);
  }
}

async function getStatus(req, res) {
  const { jobId } = req.params;
  const job = await jobManager.getJob(jobId);
  if (!job) return res.status(404).json({ error: 'job not found' });
  return res.json({ ok: true, job });
}

module.exports = { postGenerate, getStatus };
