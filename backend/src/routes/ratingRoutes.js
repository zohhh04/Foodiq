import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createRating,
  getItemRatings,
  getMyRatings,
  getLatestRatings,
  getAllRatings,
} from '../controllers/ratingController.js';

const router = Router();

router.get('/item/:id', getItemRatings);
router.get('/latest', getLatestRatings);
router.get('/my', protect, getMyRatings);
router.get('/', protect, authorize('staff', 'admin'), getAllRatings);
router.post('/', protect, createRating);

export default router;