const express = require('express');
const router = express.Router();
const scriptController = require('../controllers/scriptController');
const adminAuth = require('../middlewares/adminAuthMiddleware');
const { adminRateLimiter } = require('../middlewares/rateLimitMiddleware');

// Protected route to run allowed scripts (rate limited: 5/min)
router.post('/run', adminAuth, adminRateLimiter, scriptController.run);

module.exports = router;
