import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { exportTrainingData, askAssistant, parseOrder } from '../controllers/aiController.js';

const router = Router();

router.post('/ask', protect, askAssistant);
router.post('/order', protect, parseOrder);
router.get('/export', protect, authorize('staff', 'admin'), exportTrainingData);

export default router;