import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  register,
  resendOtp,
  verifyOtp,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  toggleFavorite,
  getFavorites,
} from '../controllers/authController.js';

const router = Router();

router.post('/register', register);
router.post('/resend-otp', resendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.get('/favorites', protect, getFavorites);
router.post('/favorites/:foodItemId', protect, toggleFavorite);

export default router;
