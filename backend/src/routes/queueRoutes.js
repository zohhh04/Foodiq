import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getLiveQueue,
  getMyPosition,
  callNextToken,
  markReady,
  markPicked,
  optimizePlan,
} from '../controllers/queueController.js';

const router = Router();

router.get('/status', getLiveQueue);
router.get('/optimize', protect, authorize('staff', 'admin'), optimizePlan);
router.get('/position/:orderId', protect, getMyPosition);
router.post('/next', protect, authorize('staff', 'admin'), callNextToken);
router.post('/:orderId/ready', protect, authorize('staff', 'admin'), markReady);
router.post('/:orderId/picked', protect, authorize('staff', 'admin'), markPicked);

export default router;
