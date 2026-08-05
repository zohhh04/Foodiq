import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createOrder,
  confirmPayment,
  getMyOrders,
  getOrder,
  updateOrderStatus,
} from '../controllers/orderController.js';

const router = Router();

router.post('/', protect, createOrder);
router.post('/:id/pay', protect, confirmPayment);
router.get('/mine', protect, getMyOrders);
router.get('/:id', protect, getOrder);
router.put('/:id/status', protect, authorize('staff', 'admin'), updateOrderStatus);

export default router;