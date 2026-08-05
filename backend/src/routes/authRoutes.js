import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  register,
  login,
  getMe,
  updateProfile,
  toggleFavorite,
  getFavorites,
} from '../controllers/authController.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.get('/favorites', protect, getFavorites);
router.post('/favorites/:foodItemId', protect, toggleFavorite);

export default router;
