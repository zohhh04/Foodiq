import axios from 'axios';
import config from '../config/index.js';

const client = axios.create({
  baseURL: config.aiServiceUrl,
  timeout: 3000,
});

const aiUnavailable = () => ({ available: false });

// GET /recommend?userId=...&limit=10&favorites=...&history=...&exclude=...
export const getRecommendations = async (userId, limit = 10, context = {}) => {
  try {
    const { favorites = [], history = [], exclude = [] } = context;
    const { data } = await client.get('/recommend', {
      params: {
        userId,
        limit,
        favorites: favorites.join(','),
        history: history.join(','),
        exclude: exclude.join(','),
      },
    });
    return { available: true, items: data.items ?? [] };
  } catch {
    return aiUnavailable();
  }
};

// POST /predict-wait { features: {...} } -> { waitMinutes }
export const predictWaitTime = async (features) => {
  try {
    const { data } = await client.post('/predict-wait', { features });
    return { available: true, waitMinutes: data.waitMinutes ?? null };
  } catch {
    return aiUnavailable();
  }
};

// GET /health
export const isAiHealthy = async () => {
  try {
    await client.get('/health');
    return true;
  } catch {
    return false;
  }
};

// POST /optimize-queue { queue: [...], staffCount } -> optimization plan
export const optimizeQueue = async (queue, staffCount = 1) => {
  try {
    const { data } = await client.post('/optimize-queue', { queue, staffCount });
    return { available: true, plan: data };
  } catch {
    return aiUnavailable();
  }
};
