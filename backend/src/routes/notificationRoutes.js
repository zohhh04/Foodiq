import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  registerPushToken,
  unregisterPushToken,
  listNotifications,
  getUnread,
  markOneRead,
  markAll,
} from '../controllers/notificationController.js';

const router = Router();

router.post('/token', protect, registerPushToken);
router.post('/token/remove', protect, unregisterPushToken);
router.get('/', protect, listNotifications);
router.get('/unread', protect, getUnread);
router.put('/read-all', protect, markAll);
router.put('/read/:id', protect, markOneRead);

export default router;
