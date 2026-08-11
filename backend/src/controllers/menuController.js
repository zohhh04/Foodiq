import Category from '../models/Category.js';
import FoodItem from '../models/FoodItem.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { getRecommendations as fetchRecommendations } from '../services/aiService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/ApiResponse.js';

// Mood -> food signals used by the AI recommendations page. `tags` are
// matched against each dish's tags; `keywords` add recall on the dish name.
const MOODS = [
  {
    key: 'happy',
    emoji: '🥳',
    label: 'Happy',
    blurb: 'Time to celebrate with something indulgent and fun.',
    tags: ['paneer', 'biryani', 'shake', 'fried', 'chinese'],
    keywords: ['biryani', 'paneer', 'shake', 'chocolate', 'fried'],
  },
  {
    key: 'spicy',
    emoji: '🌶️',
    label: 'Craving spicy',
    blurb: 'Turn up the heat with bold, fiery favourites.',
    tags: ['spicy', 'chilli'],
    keywords: ['chilli', 'schezwan', 'spicy'],
  },
  {
    key: 'sweet',
    emoji: '🍫',
    label: 'Craving sweet',
    blurb: 'Treat yourself to something creamy and sweet.',
    tags: ['shake', 'lassi', 'sweet'],
    keywords: ['chocolate', 'sweet', 'lassi', 'milkshake'],
  },
  {
    key: 'cool',
    emoji: '🧊',
    label: 'Need something cool',
    blurb: 'Chilled bites and drinks to beat the heat.',
    tags: ['cool', 'cold'],
    keywords: ['cold', 'iced', 'ice', 'shake', 'lassi', 'cool'],
  },
  {
    key: 'energy',
    emoji: '⚡',
    label: 'Tired & need energy',
    blurb: 'Hearty rice bowls, strong coffee and fuel to power through.',
    tags: ['coffee', 'tea', 'rice', 'biryani'],
    keywords: ['coffee', 'tea', 'biryani', 'fried rice', 'pongal'],
  },
  {
    key: 'chill',
    emoji: '😌',
    label: 'Chill & relaxed',
    blurb: 'Light munchies and a warm cuppa to unwind.',
    tags: ['snack', 'tea', 'coffee', 'juice'],
    keywords: ['snack', 'tea', 'coffee', 'juice', 'fries', 'sandwich'],
  },
  {
    key: 'comfort',
    emoji: '🫶',
    label: 'Comfort food',
    blurb: 'Warm, soulful dishes that feel like a hug.',
    tags: ['curry', 'dal', 'rajma', 'soup', 'coffee'],
    keywords: ['masala', 'curry', 'dal', 'rajma', 'soup', 'khichdi', 'pongal'],
  },
  {
    key: 'healthy',
    emoji: '🥗',
    label: 'Healthy & light',
    blurb: 'Fresh, steamed and guilt-free picks.',
    tags: ['idli', 'steamed', 'juice', 'vada', 'rice'],
    keywords: ['idli', 'steamed', 'juice', 'dhokla', 'fresh', 'salad'],
  },
  {
    key: 'midnight',
    emoji: '🌙',
    label: 'Midnight snacks',
    blurb: 'Fast, crispy bites for late-night cravings.',
    tags: ['noodles', 'fried', 'snack', 'fast'],
    keywords: ['noodles', 'fries', 'samosa', 'vada pav', 'spring roll'],
  },
  {
    key: 'hungry',
    emoji: '🤤',
    label: 'Super hungry',
    blurb: "Can't decide? Here's what everyone is loving right now.",
    tags: [],
    keywords: [],
  },
];

// Score how well a dish fits a mood: tag overlap is strongest, name keywords add.
const moodScore = (mood, item) => {
  const tags = new Set((item.tags || []).map((t) => t.toLowerCase()));
  let score = 0;
  for (const t of mood.tags) if (tags.has(t.toLowerCase())) score += 2;
  if (mood.keywords?.length) {
    const name = item.name.toLowerCase();
    for (const kw of mood.keywords) if (name.includes(kw)) score += 1;
  }
  return score;
};

// Fetch full docs for aggregation results, preserving the aggregated order.
const docsInOrder = async (ids, options = {}) => {
  if (!ids.length) return [];
  const query = FoodItem.find({ _id: { $in: ids } });
  if (options.inStock) query.where('inStock').equals(true);
  if (options.populate !== false) query.populate('category', 'name slug');
  const docs = await query.lean();
  const map = Object.fromEntries(docs.map((d) => [String(d._id), d]));
  return ids.map((id) => map[String(id)]).filter(Boolean);
};

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  success(res, categories);
});

export const getMenu = asyncHandler(async (req, res) => {
  const { search, category, tag, minPrice, maxPrice, inStock } = req.query;
  const query = {};

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { tags: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
    ];
  }
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

// All-in-one feed for the student AI recommendations page:
// mood-curated picks + best sellers + people's favourites + top rated +
// personalised AI picks. Falls back gracefully when data/AI is sparse.
export const getRecommendationInsights = asyncHandler(async (req, res) => {
  const moodKey = String(req.query.mood || 'happy');
  const mood = MOODS.find((m) => m.key === moodKey) || MOODS[0];

  const menu = await FoodItem.find({ inStock: true }).populate('category', 'name slug');

  // 1) Mood-based picks — scored by tag + name match, then rating.
  const scored = menu
    .map((i) => ({ item: i, score: moodScore(mood, i) }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) => b.score - a.score || (b.item.avgRating || 0) - (a.item.avgRating || 0)
    );
  let moodItems = scored.slice(0, 8).map((x) => x.item);

  // 2) Best sellers — units sold across all orders.
  const soldAgg = await Order.aggregate([
    { $match: { status: { $nin: ['cancelled'] }, 'items.foodItem': { $ne: null } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.foodItem', sold: { $sum: '$items.qty' } } },
    { $sort: { sold: -1 } },
    { $limit: 8 },
  ]);
  const soldIds = soldAgg.map((s) => s._id);
  const soldMap = Object.fromEntries(
    soldAgg.map((s, i) => [String(s._id), { sold: s.sold, rank: i + 1 }])
  );
  const bestSelling = (await docsInOrder(soldIds)).map((d) => ({
    ...d,
    sold: soldMap[String(d._id)]?.sold ?? 0,
    rank: soldMap[String(d._id)]?.rank ?? 0,
  }));

  // 3) People's favourites — number of students who saved each dish.
  const favAgg = await User.aggregate([
    { $match: { favorites: { $exists: true, $ne: [] } } },
    { $unwind: '$favorites' },
    { $group: { _id: '$favorites', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);
  const favIds = favAgg.map((f) => f._id);
  const favMap = Object.fromEntries(favAgg.map((f) => [String(f._id), f.count]));
  const mostFavorited = (await docsInOrder(favIds)).map((d) => ({
    ...d,
    favoritedBy: favMap[String(d._id)] ?? 0,
  }));

  // 4) Top rated dishes.
  const topRated = await FoodItem.find({ inStock: true })
    .populate('category', 'name slug')
    .sort({ avgRating: -1, ratingCount: -1 })
    .limit(8)
    .lean();

  // Fallback: a mood with no direct matches still gets the crowd favourites.
  if (!moodItems.length) moodItems = topRated.slice(0, 8);

  // 5) Personalised picks via the AI microservice (favourites + history context).
  const user = await User.findById(req.user._id).select('favorites');
  const historyOrders = await Order.find({ user: req.user._id }).select('items.foodItem');
  const history = [
    ...new Set(historyOrders.flatMap((o) => o.items.map((it) => it.foodItem?.toString()))),
  ].filter(Boolean);
  const favorites = (user?.favorites ?? []).map((id) => String(id));

  const ai = await fetchRecommendations(req.user._id, 8, { favorites, history });
  let personalized = [];
  let personalizedNote = 'Based on your favourites and past orders';
  if (ai.available && ai.items.length) {
    const validIds = ai.items.filter((id) => mongoose.isValidObjectId(id));
    personalized = validIds.length ? await docsInOrder(validIds, { inStock: true }) : [];
  }
  if (!personalized.length) {
    personalized = topRated.slice(0, 6);
    personalizedNote = 'Popular picks while our AI learns your taste';
  }

  const summary = {
    totalDishes: menu.length,
    avgPrice: Math.round((menu.reduce((s, i) => s + i.price, 0) / (menu.length || 1)) * 100) / 100,
    avgRating: Math.round((menu.reduce((s, i) => s + (i.avgRating || 0), 0) / (menu.length || 1)) * 10) / 10,
    totalSold: soldAgg.reduce((s, x) => s + x.sold, 0),
  };

  success(res, {
    moods: MOODS,
    mood,
    moodItems,
    bestSelling,
    mostFavorited,
    topRated,
    personalized,
    personalizedNote,
    summary,
  }, 'AI recommendation insights');
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
