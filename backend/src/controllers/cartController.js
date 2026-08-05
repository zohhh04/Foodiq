import Cart from '../models/Cart.js';
import FoodItem from '../models/FoodItem.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { success } from '../utils/ApiResponse.js';

const findCart = (userId) =>
  Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { items: [] } },
    { upsert: true, new: true }
  );

export const getCart = asyncHandler(async (req, res) => {
  const cart = await findCart(req.user._id).populate('items.foodItem');
  success(res, cart);
});

export const addToCart = asyncHandler(async (req, res) => {
  const { foodItemId, qty = 1 } = req.body;
  const item = await FoodItem.findById(foodItemId);
  if (!item) throw new ApiError(404, 'Food item not found');
  if (!item.inStock) throw new ApiError(400, 'Item is out of stock');

  const cart = await findCart(req.user._id);
  const existing = cart.items.find((i) => String(i.foodItem) === String(foodItemId));
  if (existing) existing.qty += qty;
  else cart.items.push({ foodItem: foodItemId, qty, price: item.price });
  await cart.save();

  const updated = await cart.populate('items.foodItem');
  success(res, updated, 'Added to cart');
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const { foodItemId } = req.params;
  const { qty } = req.body;
  const cart = await findCart(req.user._id);

  const existing = cart.items.find((i) => String(i.foodItem) === String(foodItemId));
  if (!existing) throw new ApiError(404, 'Item not in cart');
  if (qty <= 0) cart.items = cart.items.filter((i) => String(i.foodItem) !== String(foodItemId));
  else existing.qty = qty;
  await cart.save();

  const updated = await cart.populate('items.foodItem');
  success(res, updated, 'Cart updated');
});

export const clearCart = asyncHandler(async (req, res) => {
  const cart = await findCart(req.user._id);
  cart.items = [];
  await cart.save();
  success(res, cart, 'Cart cleared');
});
