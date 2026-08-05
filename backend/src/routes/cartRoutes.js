import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  getCart,
  addToCart,
  updateCartItem,
  clearCart,
} from '../controllers/cartController.js';

const router = Router();

router.use(protect);
router.get('/', getCart);
router.post('/', addToCart);
router.put('/:foodItemId', updateCartItem);
router.delete('/', clearCart);

export default router;