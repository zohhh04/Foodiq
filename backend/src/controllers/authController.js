import User from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { success } from '../utils/ApiResponse.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email and password are required');
  }

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already registered');

  const user = await User.create({ name, email, phone, passwordHash: password });
  const token = signToken({ id: user._id, role: user.role });

  success(res, { user, token }, 'Registered successfully', 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken({ id: user._id, role: user.role });
  success(res, { user, token }, 'Logged in successfully');
});

export const getMe = asyncHandler(async (req, res) => {
  success(res, req.user);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone, avatar },
    { new: true, runValidators: true }
  );
  success(res, user, 'Profile updated');
});

export const toggleFavorite = asyncHandler(async (req, res) => {
  const { foodItemId } = req.params;
  const user = await User.findById(req.user._id);
  const has = user.favorites.some((f) => String(f) === String(foodItemId));
  if (has) user.favorites = user.favorites.filter((f) => String(f) !== String(foodItemId));
  else user.favorites.push(foodItemId);
  await user.save();
  success(res, user.favorites, has ? 'Removed from favorites' : 'Added to favorites');
});

export const getFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'favorites',
    populate: { path: 'category', select: 'name slug' },
  });
  success(res, user.favorites, 'Your favorites');
});
