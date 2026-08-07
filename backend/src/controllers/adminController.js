import Order from '../models/Order.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/ApiResponse.js';

export const demandAnalysis = asyncHandler(async (req, res) => {
  const [totals, statusCounts, topItems, hourly] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
    ]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          qty: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: 8 },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const total = totals[0] || { orders: 0, revenue: 0 };
  const statusMap = {};
  statusCounts.forEach((s) => {
    statusMap[s._id] = s.count;
  });

  const hourlyMap = {};
  hourly.forEach((h) => {
    hourlyMap[h._id] = { orders: h.orders, revenue: h.revenue };
  });
  const hourlyOrders = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    orders: hourlyMap[hour]?.orders || 0,
    revenue: hourlyMap[hour]?.revenue || 0,
  }));

  success(res, {
    totalOrders: total.orders,
    totalRevenue: total.revenue,
    averageOrderValue: total.orders ? Math.round((total.revenue / total.orders) * 100) / 100 : 0,
    statusCounts: statusMap,
    topItems,
    hourlyOrders,
  });
});
