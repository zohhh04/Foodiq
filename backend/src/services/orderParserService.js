import FoodItem from '../models/FoodItem.js';

// Words that never belong to a dish name — stripped before matching.
const STOP = new Set([
  'i', 'me', 'my', 'want', 'wants', 'like', 'would', 'please', 'plz',
  'get', 'give', 'have', 'need', 'order', 'orders', 'some', 'a', 'an',
  'the', 'of', 'for', 'and', 'with', 'also', 'plate', 'plates',
  'serving', 'servings', 'can', 'could', 'thanks', 'thank', 'buy',
  'bring', 'make', 'wouldnt', 'wantto',
]);

const NUMBER_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  dozen: 12,
  couple: 2,
};

const normalize = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractQty = (segment) => {
  // trailing "x2" / "2x" / "×2"
  let m = segment.match(/x\s*(\d+)\s*$/);
  if (m) return { qty: parseInt(m[1], 10), rest: segment.slice(0, m.index).trim() };
  m = segment.match(/(\d+)\s*x\s*$/);
  if (m) return { qty: parseInt(m[1], 10), rest: segment.slice(0, m.index).trim() };

  // leading "2x samosa" / "x2 samosa" / "2 samosa"
  m = segment.match(/^(\d+)\s*x\s*(.+)$/);
  if (m) return { qty: parseInt(m[1], 10), rest: m[2].trim() };
  m = segment.match(/^x\s*(\d+)\s*(.+)$/);
  if (m) return { qty: parseInt(m[1], 10), rest: m[2].trim() };
  m = segment.match(/^(\d+)\s*(.+)$/);
  if (m) return { qty: parseInt(m[1], 10), rest: m[2].trim() };

  // a quantity word or digit anywhere in the segment
  const tokens = segment.split(' ');
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (/^\d+$/.test(tok) || NUMBER_WORDS[tok] != null) {
      const qty = /^\d+$/.test(tok) ? parseInt(tok, 10) : NUMBER_WORDS[tok];
      const rest = tokens.slice(0, i).concat(tokens.slice(i + 1)).join(' ').trim();
      return { qty, rest };
    }
  }

  return { qty: 1, rest: segment };
};

const cleanTokens = (segment) =>
  segment.split(' ').filter((t) => t.length >= 3 && !STOP.has(t));

// Light English stemming so plurals ("samosas") match singulars ("Samosa").
const stem = (w) => {
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  return w;
};

const matchItem = (segmentName, catalog) => {
  const seg = normalize(segmentName);
  const segTokens = cleanTokens(seg).map(stem);
  if (!seg || seg.length < 3 || segTokens.length === 0) return null;

  let best = null;
  let bestScore = 0;

  for (const it of catalog) {
    const n = normalize(it.name);
    const nTokens = n.split(' ').filter((t) => t.length >= 3).map(stem);
    if (nTokens.length === 0) continue;

    let overlap = 0;
    for (const t of nTokens) if (segTokens.includes(t)) overlap++;
    if (overlap === 0) continue;

    let score = overlap / nTokens.length;
    if (n.includes(seg)) score = Math.max(score, 0.9);
    if (seg.includes(n)) score = Math.max(score, 0.95);

    if (score > bestScore) {
      bestScore = score;
      best = it;
    }
  }

  return bestScore >= 0.55 ? { item: best, score: bestScore } : null;
};

export const parseOrderRequest = async (text) => {
  const catalog = await FoodItem.find().select('_id name price inStock');
  return parseOrderWithCatalog(text, catalog);
};

export const parseOrderWithCatalog = (text, catalog) => {
  const segments = normalize(text)
    .replace(/\b(and|plus|also|then)\b/g, ',')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);

  const matched = [];
  const unmatched = [];

  for (const segment of segments) {
    const { qty, rest } = extractQty(segment);
    if (!rest || rest.length < 3) continue;
    const hit = matchItem(rest, catalog);
    if (hit) {
      matched.push({
        foodItem: hit.item._id,
        name: hit.item.name,
        qty,
        price: hit.item.price,
        inStock: hit.item.inStock,
      });
    } else {
      unmatched.push(segment);
    }
  }

  const byId = new Map();
  for (const it of matched) {
    const key = String(it.foodItem);
    if (byId.has(key)) byId.get(key).qty += it.qty;
    else byId.set(key, { ...it });
  }

  const list = [...byId.values()];
  const items = list.filter((i) => i.inStock);
  const outOfStock = list.filter((i) => !i.inStock);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  return {
    recognized: items.length > 0,
    items,
    outOfStock,
    unmatched,
    subtotal: Math.round(subtotal * 100) / 100,
  };
};
