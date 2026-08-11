import { getRedis } from '../config/redis.js';
import Order from '../models/Order.js';
import QueueToken from '../models/QueueToken.js';
import { predictWaitTime } from './aiService.js';
import { pickupSlotDeadline } from '../utils/pickupSlot.js';

const QUEUE_KEY = 'foodiq:queue';
const NEXT_TOKEN_KEY = 'foodiq:next-token';

// Orders that belong on the live queue board. Anything picked up
// (delivered), completed or cancelled must never be shown or advanced.
const ACTIVE_STATUSES = ['placed', 'confirmed', 'preparing', 'ready'];

const isOrderActive = async (orderId) => {
  try {
    const order = await Order.findById(orderId).select('status').lean();
    return !!order && ACTIVE_STATUSES.includes(order.status);
  } catch {
    return false;
  }
};

// How many minutes the pickup slot lasts, parsed from the slot label the
// student chose. "Within 30 min" -> 30; "Custom pickup 10:00–10:30" -> 30.
const parseSlotMinutes = (slot) => {
  if (!slot) return 30;
  let m = slot.match(/Within\s+(\d+)\s*min/i);
  if (m) return Math.max(parseInt(m[1], 10) || 30, 1);
  if (/Within\s+1\.5\s*hours/i.test(slot)) return 90;
  if (/Within\s+1\s*hour/i.test(slot)) return 60;
  m = slot.match(/Within\s+(\d+)\s*hours/i);
  if (m) return Math.max((parseInt(m[1], 10) || 1) * 60, 1);
  m = slot.match(/Custom pickup\s+(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (m) {
    const toMin = (h, mer) => {
      let hour = parseInt(h, 10);
      const pm = /pm/i.test(mer || '');
      if (hour === 12) hour = pm ? 12 : 0;
      else if (pm) hour += 12;
      return hour * 60;
    };
    const from = toMin(m[1], m[3]) + parseInt(m[2], 10);
    const to = toMin(m[4], m[6]) + parseInt(m[5], 10);
    return Math.max(to - from, 1);
  }
  return 30;
};

// When the pickup-slot countdown expires for an order. The live queue timer
// starts at the slot duration and the order leaves the queue at zero.
const computeSlotDeadline = (order) => {
  const base = order.pickupSlotAt
    ? new Date(order.pickupSlotAt).getTime()
    : Date.now();
  return base + parseSlotMinutes(order.pickupSlot) * 60000;
};

const isSlotExpired = (entry, now = Date.now()) =>
  !!entry?.slotDeadline && Number(entry.slotDeadline) <= now;

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

export const enqueue = async (orderId, tokenNumber, estimatedWaitMin, slotDeadline = null) => {
  const entry = { orderId, tokenNumber, estimatedWaitMin, joinedAt: Date.now(), slotDeadline };
  const result = await withRedis(async (r) => {
    await r.rpush(QUEUE_KEY, JSON.stringify(entry));
    return true;
  });
  if (!result.ok) memoryQueue.push(entry);
  return entry;
};

export const dequeueNext = async () => {
  const result = await withRedis(async (r) => {
    while (true) {
      const raw = await r.lpop(QUEUE_KEY);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (!isSlotExpired(entry) && (await isOrderActive(entry.orderId))) return entry;
      // Stale (picked up / completed / cancelled) or expired-slot entry —
      // drop it and keep going.
    }
  });
  if (result.ok) return result.value;
  while (memoryQueue.length) {
    const entry = memoryQueue.shift();
    if (!isSlotExpired(entry) && (await isOrderActive(entry.orderId))) return entry;
  }
  return null;
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
    memoryQueue = memoryQueue.filter((e) => String(e.orderId) !== id);
    return memoryQueue.length !== before;
  }
  return result.value;
};

export const getQueueStatus = async () => {
  const result = await withRedis(async (r) => r.lrange(QUEUE_KEY, 0, -1));
  const queue = result.ok
    ? result.value.map((s) => JSON.parse(s))
    : [...memoryQueue];

  // Only keep orders that still belong in the live queue. Picked-up
  // (delivered), completed, cancelled and slot-expired orders are pruned
  // immediately so they never linger on the board.
  const now = Date.now();
  const ids = queue.map((e) => e.orderId).filter(Boolean);
  const statusMap = new Map();
  if (ids.length) {
    const orders = await Order.find({ _id: { $in: ids } }).select('status').lean();
    orders.forEach((o) => statusMap.set(String(o._id), o.status));
  }
  const kept = queue.filter((e) => {
    const status = statusMap.get(String(e.orderId));
    return !!status && ACTIVE_STATUSES.includes(status) && !isSlotExpired(e, now);
  });
  if (kept.length !== queue.length) {
    for (const entry of queue) {
      const status = statusMap.get(String(entry.orderId));
      if (!status || !ACTIVE_STATUSES.includes(status) || isSlotExpired(entry, now)) {
        await removeFromQueue(entry.orderId);
      }
    }
  }
  return kept;
};

// Queue entries sorted by pickup slot (earliest first), then join order.
export const getSortedQueue = async () => {
  const queue = await getQueueStatus();
  const ids = queue.map((e) => e.orderId).filter(Boolean);
  const slotMap = new Map();
  if (ids.length) {
    const orders = await Order.find({ _id: { $in: ids } })
      .select('pickupSlotAt pickupSlot')
      .lean();
    orders.forEach((o) =>
      slotMap.set(
        String(o._id),
        o.pickupSlotAt
          ? new Date(o.pickupSlotAt).getTime()
          : (pickupSlotDeadline(o.pickupSlot)?.getTime() ?? null)
      )
    );
  }
  return [...queue].sort((a, b) => {
    const ta = slotMap.get(String(a.orderId)) ?? Number.MAX_SAFE_INTEGER;
    const tb = slotMap.get(String(b.orderId)) ?? Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
  });
};

// Position of an order in the queue, starting at 1
export const getQueuePosition = async (orderId) => {
  const queue = await getQueueStatus();
  const idx = queue.findIndex((e) => String(e.orderId) === String(orderId));
  return idx === -1 ? null : idx + 1;
};

// Queue snapshot with 1-based positions added for live displays
export const getQueueStatusWithPositions = async () => {
  const queue = await getSortedQueue();
  let itemsMap = {};
  try {
    const { default: Order } = await import('./../models/Order.js');
    const ids = queue.map((e) => e.orderId).filter(Boolean);
    if (ids.length) {
      const orders = await Order.find({ _id: { $in: ids } }).populate('items.foodItem', 'name image');
      itemsMap = Object.fromEntries(
        orders.map((o) => [
          String(o._id),
          o.items.map((it) => ({
            name: it.name,
            qty: it.qty,
            price: it.price,
            image: it.foodItem?.image || null,
          })),
        ])
      );
    }
  } catch {
    itemsMap = {};
  }
  return queue.map((entry, idx) => ({
    ...entry,
    position: idx + 1,
    items: itemsMap[String(entry.orderId)] || [],
  }));
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
  const slotDeadline = computeSlotDeadline(order);
  const entry = await enqueue(order._id, tokenNumber, estimatedWaitMin, slotDeadline);

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
// A picked token maps to the order status 'delivered' (picked up, awaiting rating);
// the order only becomes 'completed' once the student rates it.
export const setTokenStatus = async (orderId, status) => {
  if (!['preparing', 'ready', 'picked'].includes(status)) return null;
  const token = await QueueToken.findOneAndUpdate(
    { order: orderId },
    { status },
    { new: true }
  );
  if (!token) return null;
  const orderStatus = status === 'picked' ? 'delivered' : status;
  await Order.findByIdAndUpdate(orderId, { status: orderStatus });
  return token;
};
