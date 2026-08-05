import User from '../models/User.js';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { success } from '../utils/ApiResponse.js';

// Register a device push token (FCM) for the authenticated user.
export const registerPushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string' || token.length < 8) {
    throw new ApiError(400, 'A valid push token is required');
  }

  const user = await User.findById(req.user._id);
  const has = user.pushTokens.some((t) => t === token);
  if (!has) {
    user.pushTokens.push(token);
    await user.save();
  }
  success(res, { registered: true }, 'Push token registered');
});

export const unregisterPushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user._id);
  user.pushTokens = user.pushTokens.filter((t) => t !== token);
  await user.save();
  success(res, { registered: false }, 'Push token removed');
});

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await getNotifications(req.user._id);
  const unread = await getUnreadCount(req.user._id);
  success(res, { notifications, unread });
});

export const getUnread = asyncHandler(async (req, res) => {
  const unread = await getUnreadCount(req.user._id);
  success(res, { unread });
});

export const markOneRead = asyncHandler(async (req, res) => {
  const notification = await markRead(req.user._id, req.params.id);
  if (!notification) throw new ApiError(404, 'Notification not found');
  success(res, notification, 'Marked as read');
});

export const markAll = asyncHandler(async (req, res) => {
  await markAllRead(req.user._id);
  success(res, { read: true }, 'All notifications marked as read');
});
