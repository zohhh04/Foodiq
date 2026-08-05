import Redis from 'ioredis';
import config from './index.js';

let redisClient = null;

export const getRedis = () => {
  if (!redisClient) {
    redisClient = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    // Fail silently: the queue services fall back to in-memory state.
    redisClient.on('error', () => {});
  }
  return redisClient;
};
