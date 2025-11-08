const express = require('express');
const router = express.Router();
const scriptController = require('../controllers/scriptController');
const adminAuth = require('../middlewares/adminAuthMiddleware');

// Protected route to run allowed scripts
router.post('/run', adminAuth, scriptController.run);

module.exports = router;
