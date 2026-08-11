import {
  getQueueStatusWithPositions,
  getQueuePosition,
  markNextPreparing,
  setTokenStatus,
  broadcastQueueUpdate,
} from '../services/queueService.js';
import { optimizeQueue as aiOptimizeQueue } from '../services/aiService.js';
import { notifyUser } from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/ApiResponse.js';

export const getLiveQueue = asyncHandler(async (req, res) => {
  const queue = await getQueueStatusWithPositions();
  success(res, queue, 'Live queue status');
});

export const getMyPosition = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const position = await getQueuePosition(orderId);
  success(res, { orderId, position }, position ? 'Position found' : 'Order not in queue');
});

// Staff: call the next waiting token to the counter (moves to preparing).
export const callNextToken = asyncHandler(async (req, res) => {
  const entry = await markNextPreparing();
  if (!entry) throw new Error('Queue is empty');

  const io = req.app.get('io');
  if (io) {
    await broadcastQueueUpdate(io);
    io.to(`order:${entry.orderId}`).emit('order:status', {
      orderId: entry.orderId,
      status: 'preparing',
    });
  }

  const { default: Order } = await import('../models/Order.js');
  const order = await Order.findById(entry.orderId);
  if (order?.user) {
    await notifyUser({
      userId: order.user,
      title: `Token ${entry.tokenNumber} called!`,
      body: 'Your order is now being prepared.',
      type: 'order',
      data: { orderId: String(entry.orderId), status: 'preparing' },
    });
  }

  success(res, entry, `Now preparing token ${entry.tokenNumber}`);
});

// Staff: mark a token as ready for pickup.
export const markReady = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const token = await setTokenStatus(orderId, 'ready');
  if (!token) throw new Error('Token not found for this order');

  const { default: Order } = await import('../models/Order.js');
  const order = await Order.findById(orderId);

  const io = req.app.get('io');
  if (io) {
    io.to(`order:${orderId}`).emit('order:status', {
      orderId,
      status: 'ready',
      tokenNumber: token.tokenNumber,
    });
    await broadcastQueueUpdate(io);
  }

  if (order?.user) {
    await notifyUser({
      userId: order.user,
      title: `Order ${order.tokenNumber ?? token.tokenNumber} is ready`,
      body: `Token ${token.tokenNumber} is ready for pickup at the counter.`,
      type: 'order',
      data: {
        orderId: String(orderId),
        status: 'ready',
        tokenNumber: token.tokenNumber,
        pickupSlot: order.pickupSlot,
        total: order.total,
        paymentMethod: order.paymentMethod,
        items: order.items.map((i) => ({ name: i.name, qty: i.qty })),
      },
    });
  }

  success(res, token, `Token ${token.tokenNumber} marked ready`);
});

// Staff: mark a token as picked up. The order becomes 'delivered' (picked up,
// awaiting the student's rating) and leaves the queue. It only reaches
// 'completed' once the student rates it.
export const markPicked = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const token = await setTokenStatus(orderId, 'picked');
  if (!token) throw new Error('Token not found for this order');

  const { default: Order } = await import('../models/Order.js');
  const { removeFromQueue } = await import('../services/queueService.js');
  await removeFromQueue(orderId);

  const order = await Order.findById(orderId);
  const io = req.app.get('io');
  if (io) {
    io.to(`order:${orderId}`).emit('order:status', {
      orderId,
      status: 'delivered',
      tokenNumber: token.tokenNumber,
    });
    await broadcastQueueUpdate(io);
  }

  if (order?.user) {
    await notifyUser({
      userId: order.user,
      title: `Order ${order.tokenNumber ?? token.tokenNumber} has been picked up`,
      body: `Your order (Token ${token.tokenNumber}) has been picked up. Enjoy your meal! Please rate your experience. ⭐`,
      type: 'order',
      data: {
        orderId: String(orderId),
        status: 'delivered',
        tokenNumber: token.tokenNumber,
        pickupSlot: order.pickupSlot,
        total: order.total,
        paymentMethod: order.paymentMethod,
        deliveredAt: order.updatedAt,
        items: order.items.map((i) => ({ name: i.name, qty: i.qty })),
      },
    });
  }

  success(res, token, `Token ${token.tokenNumber} picked up`);
});

// AI-driven queue optimisation plan for staff: ETAs, cooking batches,
// "start next" suggestions and a load forecast.
export const optimizePlan = asyncHandler(async (req, res) => {
  const { default: Order } = await import('../models/Order.js');
  const queue = await getQueueStatusWithPositions();
  const staffCount = Number(req.query.staff || 1) || 1;

  const orderIds = queue.map((e) => e.orderId).filter(Boolean);
  const orders = await Order.find({ _id: { $in: orderIds } })
    .populate('items.foodItem', 'prepTimeMin')
    .select('items.foodItem items.qty');
  const prepMap = new Map(
    orders.map((o) => [
      String(o._id),
      o.items.map((it) => ({
        qty: it.qty,
        prepTimeMin: it.foodItem?.prepTimeMin ?? 3,
      })),
    ])
  );

  const enriched = queue.map((e) => ({
    ...e,
    items: prepMap.get(String(e.orderId)) ?? [],
  }));

  const result = await aiOptimizeQueue(enriched, staffCount);
  if (!result.available) {
    success(res, null, 'AI unavailable; nothing to optimise');
    return;
  }
  success(res, result.plan, 'Queue optimisation plan');
});
