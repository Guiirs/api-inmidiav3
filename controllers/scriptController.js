const scriptRunner = require('../services/scriptRunner');
const { validationResult, body } = require('express-validator');
const path = require('path');

// Allowed scripts whitelist (relative to scripts/)
const ALLOWED_SCRIPTS = new Set([
  'conversion/test_excel_to_pdf.js',
  'template-tools/analyze_contrato_template.js',
  'template-tools/add_placeholders_to_contrato.js',
  // add more allowed scripts here
]);

async function run(req, res) {
  // simple validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { script, args = [], background = false } = req.body;

  if (!script) return res.status(400).json({ error: 'script is required' });

  // Normalize path and enforce whitelist
  const normalized = path.normalize(script).replace(/^\.\.[/\\]/, '');
  if (!ALLOWED_SCRIPTS.has(normalized)) {
    return res.status(403).json({ error: 'script not allowed' });
  }

  try {
    const result = await scriptRunner.runScript(normalized, { args, background });
    return res.json({ ok: true, result });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = {
  run: [
    body('script').isString().notEmpty(),
    body('args').optional().isArray(),
    body('background').optional().isBoolean(),
    run,
  ],
};
