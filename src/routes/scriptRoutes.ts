// @ts-nocheck
import { Router } from 'express';
import { run, runValidation } from '../controllers/scriptController';
import adminAuth from '../middlewares/adminAuthMiddleware';
import { adminRateLimiter } from '../middlewares/rateLimitMiddleware';

const router = Router();

// Protected route to run allowed scripts (rate limited: 5/min)
router.post('/run', adminAuth, adminRateLimiter, runValidation, run);

export default router;
