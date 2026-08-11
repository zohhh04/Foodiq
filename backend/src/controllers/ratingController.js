import Rating from '../models/Rating.js';
import FoodItem from '../models/FoodItem.js';
import Order from '../models/Order.js';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { success } from '../utils/ApiResponse.js';

export const createRating = asyncHandler(async (req, res) => {
  const { order, foodItem, rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) throw new ApiError(400, 'Rating must be 1-5');

  // The rated order must belong to the user and have been picked up (delivered)
  // or completed. Rating a delivered order completes it.
  const targetOrder = await Order.findById(order);
  if (!targetOrder) throw new ApiError(404, 'Order not found');
  if (String(targetOrder.user) !== String(req.user._id)) {
    throw new ApiError(403, 'Not authorized to rate this order');
  }
  if (!['delivered', 'completed'].includes(targetOrder.status)) {
    throw new ApiError(400, 'Only picked-up orders can be rated');
  }

  // If rating a specific item, it must be part of the order.
  if (foodItem) {
    const inOrder = targetOrder.items.some((it) => String(it.foodItem) === String(foodItem));
    if (!inOrder) throw new ApiError(400, 'Item is not part of this order');
  }

  const existing = await Rating.findOne({ user: req.user._id, order });
  if (existing) throw new ApiError(409, 'Already rated this order');

  const created = await Rating.create({ user: req.user._id, order, foodItem, rating, comment });

  // A picked-up (delivered) order only becomes "completed" once the student rates it.
  // That is when it shows up on the admin's Order Completed page, with this rating.
  if (targetOrder.status === 'delivered') {
    targetOrder.status = 'completed';
    await targetOrder.save();

    const { default: app } = await import('../app.js');
    const io = app.get('io');
    if (io) {
      io.to(`order:${String(targetOrder._id)}`).emit('order:status', {
        orderId: String(targetOrder._id),
        status: 'completed',
        tokenNumber: targetOrder.tokenNumber,
      });
      // Let staff pages (e.g. Order Completed) pick up the new rated order live.
      io.to('queue:counter').emit('rating:submitted', {
        orderId: String(targetOrder._id),
      });
      const { broadcastQueueUpdate } = await import('../services/queueService.js');
      await broadcastQueueUpdate(io);
    }
  }

  if (foodItem) {
    const foodItemId = mongoose.isValidObjectId(foodItem)
      ? new mongoose.Types.ObjectId(String(foodItem))
      : null;
    if (foodItemId) {
      const agg = await Rating.aggregate([
        { $match: { foodItem: foodItemId } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]);
      if (agg.length) {
        await FoodItem.findByIdAndUpdate(foodItemId, {
          avgRating: Math.round(agg[0].avg * 10) / 10,
          ratingCount: agg[0].count,
        });
      }
    }
  }

  success(res, created, 'Rating submitted', 201);
});

export const getItemRatings = asyncHandler(async (req, res) => {
  const ratings = await Rating.find({ foodItem: req.params.id })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 });
  success(res, ratings);
});

// The user's own ratings, so the UI can pre-fill "already rated" states.
export const getMyRatings = asyncHandler(async (req, res) => {
  const ratings = await Rating.find({ user: req.user._id })
    .populate('order', 'tokenNumber total createdAt')
    .populate('foodItem', 'name')
    .select('order foodItem rating comment createdAt')
    .sort({ createdAt: -1 });
  success(res, ratings);
});

// All ratings, for staff — used to show stars + comments on completed orders.
export const getAllRatings = asyncHandler(async (req, res) => {
  const ratings = await Rating.find()
    .populate('order', 'tokenNumber total createdAt')
    .populate('user', 'name email role')
    .select('order user rating comment createdAt')
    .sort({ createdAt: -1 });
  success(res, ratings);
});

// The latest handful of ratings, for the "Loved by students & staff" section.
export const getLatestRatings = asyncHandler(async (req, res) => {
  const ratings = await Rating.find()
    .populate('user', 'name role')
    .populate('foodItem', 'name')
    .populate('order', 'tokenNumber')
    .select('rating comment createdAt')
    .sort({ createdAt: -1 })
    .limit(6);
  success(res, ratings);
});
