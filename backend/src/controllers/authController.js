import crypto from 'crypto';
import User from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { success } from '../utils/ApiResponse.js';
import { sendEmail, otpTemplate, resetPasswordTemplate, buildResetLink } from '../utils/sendEmail.js';

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role = 'student' } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email and password are required');
  }
  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }
  if (!['student', 'admin', 'customer'].includes(role)) {
    throw new ApiError(400, 'Invalid role');
  }

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already registered');

  const otp = generateOtp();
  const user = await User.create({
    name,
    email,
    phone,
    role,
    passwordHash: password,
    verified: false,
    otp,
    otpExpires: Date.now() + 10 * 60 * 1000,
  });

  await sendEmail({
    to: user.email,
    subject: 'Foodiq - Verify your email',
    text: `Your Foodiq verification OTP is: ${otp}. It is valid for 10 minutes.`,
    html: otpTemplate({ otp }),
  });

  success(res, null, 'OTP sent to your email. Please verify to continue.', 201);
});

export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Please provide your email');

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'User not found');
  if (user.verified) throw new ApiError(400, 'Account already verified');

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'Foodiq - Your new verification OTP',
    text: `Your Foodiq verification OTP is: ${otp}. It is valid for 10 minutes.`,
    html: otpTemplate({ otp }),
  });

  success(res, null, 'A new OTP has been sent to your email');
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'User not found');
  if (user.verified) throw new ApiError(400, 'Account already verified');
  if (!user.otp || user.otp !== otp || user.otpExpires < Date.now()) {
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  user.verified = true;
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  const token = signToken({ id: user._id, role: user.role });
  success(res, { user, token }, 'Email verified. You can now login.');
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.verified && user.otp) {
    throw new ApiError(403, 'Please verify your email first');
  }

  const token = signToken({ id: user._id, role: user.role });
  success(res, { user, token }, 'Logged in successfully');
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Please provide your email');

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'No account found with this email');

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'Foodiq - Reset your password',
    text: `Hello ${user.name},\n\nA password reset was requested for your Foodiq account.\n\nClick the link below to set a new password (valid for 1 hour):\n${buildResetLink(rawToken)}\n\nIf you didn't request this, you can safely ignore this email.\n\n- Foodiq Team`,
    html: resetPasswordTemplate({ name: user.name, resetLink: buildResetLink(rawToken) }),
  });

  success(res, null, 'A password reset link has been sent to your email');
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  if (!token) throw new ApiError(400, 'Reset token is required');
  if (!password || !confirmPassword) {
    throw new ApiError(400, 'Please enter your new password and confirm it');
  }
  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }
  if (password !== confirmPassword) {
    throw new ApiError(400, 'Passwords do not match');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) throw new ApiError(400, 'Invalid or expired reset link');

  user.passwordHash = password;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  success(res, null, 'Password reset successful. You can now login with your new password.');
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
