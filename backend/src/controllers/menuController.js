import Category from '../models/Category.js';
import FoodItem from '../models/FoodItem.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { getRecommendations as fetchRecommendations } from '../services/aiService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/ApiResponse.js';

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  success(res, categories);
});

export const getMenu = asyncHandler(async (req, res) => {
  const { search, category, tag, minPrice, maxPrice, inStock } = req.query;
  const query = {};

  if (search) query.$text = { $search: search };
  if (category) query.category = category;
  if (tag) query.tags = tag;
  if (minPrice || maxPrice) query.price = {};
  if (minPrice) query.price.$gte = Number(minPrice);
  if (maxPrice) query.price.$lte = Number(maxPrice);
  if (inStock !== undefined) query.inStock = inStock === 'true';

  const items = await FoodItem.find(query)
    .populate('category', 'name slug')
    .sort({ createdAt: -1 });

  success(res, items);
});

export const getMenuItem = asyncHandler(async (req, res) => {
  const item = await FoodItem.findById(req.params.id).populate('category', 'name slug');
  if (!item) throw new Error('Food item not found');
  success(res, item);
});

// AI-powered recommendations for the signed-in user.
// Gathers favorites + past-ordered items as cold-start context, asks the AI
// microservice, then fetches the full item documents for the returned ids.
export const getRecommendations = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('favorites');
  const historyOrders = await Order.find({ user: req.user._id }).select('items.foodItem');
  const history = [
    ...new Set(historyOrders.flatMap((o) => o.items.map((it) => it.foodItem?.toString()))),
  ].filter(Boolean);
  const favorites = (user?.favorites ?? []).map((id) => String(id));

  const result = await fetchRecommendations(req.user._id, 10, {
    favorites,
    history,
  });

  if (!result.available || !result.items.length) {
    const fallback = await FoodItem.find({ inStock: true }).sort({ avgRating: -1 }).limit(10);
    success(res, fallback, 'AI unavailable; served popular fallback');
    return;
  }

  const validIds = result.items.filter((id) => mongoose.isValidObjectId(id));
  if (!validIds.length) {
    const fallback = await FoodItem.find({ inStock: true }).sort({ avgRating: -1 }).limit(10);
    success(res, fallback, 'AI model not aligned yet; served popular fallback');
    return;
  }

  const docs = await FoodItem.find({ _id: { $in: validIds }, inStock: true })
    .populate('category', 'name slug');
  const order = Object.fromEntries(validIds.map((id) => [String(id), true]));
  docs.sort((a, b) => (order[String(b._id)] ? 1 : 0) - (order[String(a._id)] ? 1 : 0));
  success(res, docs, 'AI recommendations');
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  success(res, category, 'Category created', 201);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!category) throw new Error('Category not found');
  success(res, category, 'Category updated');
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new Error('Category not found');
  await FoodItem.updateMany({ category: req.params.id }, { $unset: { category: '' } });
  success(res, null, 'Category deleted');
});

export const createItem = asyncHandler(async (req, res) => {
  const item = await FoodItem.create(req.body);
  success(res, item, 'Menu item created', 201);
});

export const updateItem = asyncHandler(async (req, res) => {
  const item = await FoodItem.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!item) throw new Error('Food item not found');
  success(res, item, 'Menu item updated');
});

export const deleteItem = asyncHandler(async (req, res) => {
  const item = await FoodItem.findByIdAndDelete(req.params.id);
  if (!item) throw new Error('Food item not found');
  success(res, null, 'Menu item deleted');
});
