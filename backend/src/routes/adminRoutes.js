import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { demandAnalysis } from '../controllers/adminController.js';

const router = Router();

router.use(protect, authorize('staff', 'admin'));

router.get('/demand', demandAnalysis);

export default router;
