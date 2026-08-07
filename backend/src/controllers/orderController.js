import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import config from '../config/index.js';
import { issueToken } from '../services/queueService.js';
import { notifyUser } from '../services/notificationService.js';
import {
  createPaymentOrder,
  verifyPaymentSignature,
} from '../services/paymentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { success } from '../utils/ApiResponse.js';

const TAX_RATE = 0.05;

// Finalize a paid order: issue token, clear cart, broadcast + notify.
const finalizeOrder = async (orderId, userId) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.status !== 'placed' || order.paymentStatus !== 'pending') {
    return { order, alreadyFinalized: true };
  }

  order.paymentStatus = 'paid';
  await order.save();

  const token = await issueToken(order);
  await Cart.findOneAndUpdate({ user: userId }, { items: [] });

  const { default: app } = await import('../app.js');
  const io = app.get('io');
  if (io) {
    io.to(`user:${String(userId)}`).emit('order:placed', {
      orderId: String(order._id),
      tokenNumber: token.tokenNumber,
      estimatedWaitMin: token.estimatedWaitMin,
      position: token.position,
    });
    io.to(`order:${String(order._id)}`).emit('order:status', {
      orderId: String(order._id),
      status: 'placed',
      tokenNumber: token.tokenNumber,
    });
    const { broadcastQueueUpdate } = await import('../services/queueService.js');
    await broadcastQueueUpdate(io);
  }

  await notifyUser({
    userId,
    title: `Order placed #${token.tokenNumber}`,
    body: `Your estimated wait is ${token.estimatedWaitMin} min. Token: ${token.tokenNumber}`,
  });

  return { order, token };
};

export const createOrder = asyncHandler(async (req, res) => {
  const { paymentMethod = 'upi', pickupSlot = 'Quick pickup (ASAP)' } = req.body;
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.foodItem');

  if (!cart || cart.items.length === 0) throw new ApiError(400, 'Cart is empty');

  const items = cart.items.map((i) => ({
    foodItem: i.foodItem._id,
    name: i.foodItem.name,
    qty: i.qty,
    price: i.foodItem.price,
  }));
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const order = await Order.create({
    user: req.user._id,
    items,
    subtotal,
    tax,
    total,
    status: 'placed',
    paymentStatus: 'pending',
    paymentMethod,
    pickupSlot,
  });

  const payment = await createPaymentOrder({
    amount: total,
    receipt: `order_${order._id}`,
  });

  // Mock mode (no Razorpay keys): mark paid and finalize immediately.
  if (payment.mock) {
    const finalized = await finalizeOrder(order._id, req.user._id);
    return success(res, finalized, 'Order placed', 201);
  }

  return success(
    res,
    {
      order,
      razorpay: {
        orderId: payment.razorpayOrder.id,
        amount: payment.razorpayOrder.amount,
        currency: payment.razorpayOrder.currency,
        keyId: config.razorpayKeyId,
      },
    },
    'Order created. Complete payment to confirm.',
    201
  );
});

export const confirmPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) throw new ApiError(404, 'Order not found');
  if (String(order.user) !== String(req.user._id)) throw new ApiError(403, 'Not authorized');

  if (
    !verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)
  ) {
    order.paymentStatus = 'failed';
    await order.save();
    throw new ApiError(400, 'Payment verification failed');
  }

  const finalized = await finalizeOrder(order._id, req.user._id);
  success(res, finalized, 'Payment confirmed', 200);
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  success(res, orders);
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) {
    const allowed = ['placed', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!allowed.includes(status)) throw new ApiError(400, 'Invalid status filter');
    filter.status = status;
  }
  const orders = await Order.find(filter)
    .populate('user', 'name email phone role')
    .sort({ createdAt: -1 });
  success(res, orders);
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('items.foodItem', 'name image');
  if (!order) throw new ApiError(404, 'Order not found');
  if (String(order.user._id) !== String(req.user._id) && req.user.role === 'customer') {
    throw new ApiError(403, 'Not authorized');
  }
  success(res, order);
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!order) throw new ApiError(404, 'Order not found');

  // Keep the queue token in sync when staff moves the order along.
  const tokenStatusMap = { preparing: 'preparing', ready: 'ready', completed: 'picked' };
  if (tokenStatusMap[status]) {
    const { default: QueueToken } = await import('../models/QueueToken.js');
    await QueueToken.findOneAndUpdate({ order: order._id }, { status: tokenStatusMap[status] });
  }

  // Once completed, the order leaves the live queue and moves to the order history.
  if (status === 'completed') {
    const { removeFromQueue } = await import('../services/queueService.js');
    await removeFromQueue(order._id);
  }

  const { default: app } = await import('../app.js');
  const io = app.get('io');

  if (io) {
    io.to(`order:${order._id}`).emit('order:status', {
      orderId: order._id,
      status,
      tokenNumber: order.tokenNumber,
    });
    const { broadcastQueueUpdate } = await import('../services/queueService.js');
    await broadcastQueueUpdate(io);
  }

  if (order.user) {
    const { default: QueueToken } = await import('../models/QueueToken.js');
    const token = await QueueToken.findOne({ order: order._id });
    await notifyUser({
      userId: order.user,
      title: `Order ${order.tokenNumber} is ${status}`,
      body:
        status === 'ready'
          ? `Token ${order.tokenNumber} is ready for pickup at the counter.`
          : status === 'completed'
            ? `Your order (Token ${order.tokenNumber}) has been picked up. Enjoy your meal! 🎉`
            : 'Your food is on the way! Check the live queue for your token.',
      type: 'order',
      data: {
        orderId: String(order._id),
        status,
        tokenNumber: order.tokenNumber ?? token?.tokenNumber,
        pickupSlot: order.pickupSlot,
        total: order.total,
        paymentMethod: order.paymentMethod,
        completedAt: order.updatedAt,
        items: order.items.map((i) => ({ name: i.name, qty: i.qty })),
      },
    });
  }

  success(res, order, 'Order status updated');
});