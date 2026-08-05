import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendPush } from './fcm.js';

export const notifyUser = async ({ userId, title, body, type = 'order', data = {} }) => {
  const notification = await Notification.create({ user: userId, title, body, type });

  // In-app socket push to any live sessions of this user.
  const { default: app } = await import('../app.js');
  const io = app.get('io');
  if (io) io.to(`user:${String(userId)}`).emit('notification', notification.toJSON());

  // Push to registered device tokens (mock when FCM not configured).
  const user = await User.findById(userId).select('pushTokens');
  const tokens = user?.pushTokens ?? [];
  sendPush({ tokens, title, body, data }).catch(() => {});

  return notification;
};

export const getNotifications = (userId) =>
  Notification.find({ user: userId }).sort({ createdAt: -1 });

export const getUnreadCount = (userId) =>
  Notification.countDocuments({ user: userId, read: false });

export const markRead = (userId, id) =>
  Notification.findOneAndUpdate({ _id: id, user: userId }, { read: true }, { new: true });

export const markAllRead = (userId) =>
  Notification.updateMany({ user: userId, read: false }, { read: true });
