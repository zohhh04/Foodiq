import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  createRating,
  getItemRatings,
  getMyRatings,
  getLatestRatings,
} from '../controllers/ratingController.js';

const router = Router();

router.get('/item/:id', getItemRatings);
router.get('/latest', getLatestRatings);
router.get('/my', protect, getMyRatings);
router.post('/', protect, createRating);

export default router;