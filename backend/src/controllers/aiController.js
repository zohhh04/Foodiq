import FoodItem from '../models/FoodItem.js';
import Order from '../models/Order.js';
import Rating from '../models/Rating.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { success } from '../utils/ApiResponse.js';
import { answerQuestion } from '../services/assistantService.js';
import { parseOrderRequest } from '../services/orderParserService.js';

// Foodiq AI assistant — answers student/admin questions precisely.
export const askAssistant = asyncHandler(async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string' || question.trim().length < 2) {
    throw new ApiError(400, 'Please ask a question');
  }
  success(res, answerQuestion(question, req.user?.role));
});

// AI-assisted ordering — parse a natural-language request into cart items.
export const parseOrder = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length < 2) {
    throw new ApiError(400, 'Please tell me what you would like to order');
  }
  const result = await parseOrderRequest(text);
  success(res, result);
});

// Export a training snapshot (catalog + orders + ratings) in the exact shape
// `ai/train.py` expects, so models are trained on real Foodiq ids.
export const exportTrainingData = asyncHandler(async (req, res) => {
  const catalog = await FoodItem.find().select(
    '_id name tags category prepTimeMin inStock'
  );
  const orders = await Order.find({
    status: { $in: ['completed', 'picked'] },
  }).select('user items subtotal status createdAt completedAt');

  const ratings = await Rating.find().select('user foodItem rating');

  const payload = {
    catalog: catalog.map((i) => ({
      _id: i._id,
      name: i.name,
      tags: i.tags,
      category: i.category,
      prepTimeMin: i.prepTimeMin,
      inStock: i.inStock,
    })),
    orders: orders.map((o) => ({
      user: o.user,
      status: o.status,
      createdAt: o.createdAt,
      completedAt: o.updatedAt,
      subtotal: o.subtotal,
      items: o.items.map((it) => ({ foodItem: it.foodItem, qty: it.qty })),
    })),
    ratings: ratings.map((r) => ({
      user: r.user,
      foodItem: r.foodItem,
      rating: r.rating,
    })),
  };

  success(res, payload, 'Training data export');
});