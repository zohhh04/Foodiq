import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { exportTrainingData } from '../controllers/aiController.js';

const router = Router();

router.get('/export', protect, authorize('staff', 'admin'), exportTrainingData);

export default router;