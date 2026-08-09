import { getRedis } from '../config/redis.js';
import Order from '../models/Order.js';
import QueueToken from '../models/QueueToken.js';
import { predictWaitTime } from './aiService.js';

const QUEUE_KEY = 'foodiq:queue';
const NEXT_TOKEN_KEY = 'foodiq:next-token';

// In-memory fallback when Redis is down
let memoryQueue = [];
let memoryNextToken = 0;
let memorySeeded = false;

// Highest token number ever issued, so the counter never reuses a number
// even after a restart or a Redis flush.
const getMaxIssuedToken = async () => {
  const [order, token] = await Promise.all([
    Order.findOne().sort({ tokenNumber: -1 }).select('tokenNumber').lean(),
    QueueToken.findOne().sort({ tokenNumber: -1 }).select('tokenNumber').lean(),
  ]);
  return Math.max(order?.tokenNumber || 0, token?.tokenNumber || 0);
};

const withRedis = async (fn) => {
  const redis = getRedis();
  try {
    await redis.connect();
    return { ok: true, value: await fn(redis) };
  } catch {
    return { ok: false };
  } finally {
    if (redis.status === 'ready') redis.disconnect();
  }
};

export const getNextToken = async () => {
  const result = await withRedis(async (r) => {
    const exists = await r.exists(NEXT_TOKEN_KEY);
    if (!exists) {
      const maxToken = await getMaxIssuedToken();
      await r.set(NEXT_TOKEN_KEY, String(maxToken));
    }
    return (await r.incr(NEXT_TOKEN_KEY)).toString();
  });
  if (result.ok) return Number(result.value);
  if (!memorySeeded) {
    memoryNextToken = (await getMaxIssuedToken()) + 1;
    memorySeeded = true;
  }
  return memoryNextToken++;
};

export const enqueue = async (orderId, tokenNumber, estimatedWaitMin) => {
  const entry = { orderId, tokenNumber, estimatedWaitMin, joinedAt: Date.now() };
  const result = await withRedis(async (r) => {
    await r.rpush(QUEUE_KEY, JSON.stringify(entry));
    return true;
  });
  if (!result.ok) memoryQueue.push(entry);
  return entry;
};

export const dequeueNext = async () => {
  const result = await withRedis(async (r) => r.lpop(QUEUE_KEY));
  if (result.ok) return result.value ? JSON.parse(result.value) : null;
  return memoryQueue.shift() ?? null;
};

// Remove a specific order from the queue (called when the order is completed).
export const removeFromQueue = async (orderId) => {
  const id = String(orderId);
  const result = await withRedis(async (r) => {
    const items = await r.lrange(QUEUE_KEY, 0, -1);
    const kept = items.filter((s) => {
      try {
        return JSON.parse(s).orderId !== id;
      } catch {
        return true;
      }
    });
    if (kept.length === items.length) return false;
    await r.del(QUEUE_KEY);
    if (kept.length) await r.rpush(QUEUE_KEY, ...kept);
    return true;
  });
  if (!result.ok) {
    const before = memoryQueue.length;
    memoryQueue = memoryQueue.filter((e) => e.orderId !== id);
    return memoryQueue.length !== before;
  }
  return result.value;
};

export const getQueueStatus = async () => {
  const result = await withRedis(async (r) => r.lrange(QUEUE_KEY, 0, -1));
  const queue = result.ok
    ? result.value.map((s) => JSON.parse(s))
    : [...memoryQueue];
  return queue;
};

// Position of an order in the queue, starting at 1
export const getQueuePosition = async (orderId) => {
  const queue = await getQueueStatus();
  const idx = queue.findIndex((e) => e.orderId === String(orderId));
  return idx === -1 ? null : idx + 1;
};

// Queue snapshot with 1-based positions added for live displays
export const getQueueStatusWithPositions = async () => {
  const queue = await getQueueStatus();
  return queue.map((entry, idx) => ({ ...entry, position: idx + 1 }));
};

// Broadcast the live queue + per-order wait predictions to the counter room
export const broadcastQueueUpdate = async (io) => {
  if (!io) return;
  const positions = await getQueueStatusWithPositions();
  io.to('queue:counter').emit('queue:update', positions);

  for (const entry of positions) {
    io.to(`order:${entry.orderId}`).emit('wait:prediction', {
      orderId: entry.orderId,
      estimatedWaitMin: entry.estimatedWaitMin,
      position: entry.position,
    });
  }
};

// Heuristic fallback wait time when the AI model is unavailable
export const estimateWaitFallback = (queue, order) => {
  const ahead = queue.length;
  const orderPrep = order.items.reduce((sum, it) => sum + (it.prepTime ?? 3), 0);
  return Math.round(ahead * 3 + orderPrep);
};

// Issue a token for an order: predict wait, enqueue, save QueueToken, return position
export const issueToken = async (order) => {
  const tokenNumber = await getNextToken();
  const queue = await getQueueStatus();

  const prediction = await predictWaitTime({
    queueLength: queue.length,
    orderItems: order.items.length,
    totalQty: order.items.reduce((s, i) => s + i.qty, 0),
    subtotal: order.subtotal,
  });
  const estimatedWaitMin =
    prediction.available && prediction.waitMinutes != null
      ? Math.round(prediction.waitMinutes)
      : estimateWaitFallback(queue, order);

  const position = queue.length + 1;
  const entry = await enqueue(order._id, tokenNumber, estimatedWaitMin);

  const token = await QueueToken.create({
    order: order._id,
    tokenNumber,
    status: 'waiting',
    estimatedWaitMin,
  });

  await Order.findByIdAndUpdate(order._id, {
    tokenNumber,
    queuePosition: position,
    estimatedWaitMin,
  });

  return { tokenNumber, position, estimatedWaitMin, entry };
};

// Mark the next waiting token as preparing (called by staff endpoint)
export const markNextPreparing = async () => {
  const entry = await dequeueNext();
  if (!entry) return null;
  await QueueToken.findOneAndUpdate({ order: entry.orderId }, { status: 'preparing' });
  await Order.findByIdAndUpdate(entry.orderId, { status: 'preparing' });
  return entry;
};

// Move a specific token/order to a new status and sync the Order doc.
// Valid token statuses: waiting -> preparing -> ready -> picked.
export const setTokenStatus = async (orderId, status) => {
  if (!['preparing', 'ready', 'picked'].includes(status)) return null;
  const token = await QueueToken.findOneAndUpdate(
    { order: orderId },
    { status },
    { new: true }
  );
  if (!token) return null;
  const orderStatus = status === 'picked' ? 'completed' : status;
  await Order.findByIdAndUpdate(orderId, { status: orderStatus });
  return token;
};
