const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class CacheService {
  static async get(key) {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('Cache get failed:', error);
      return null;
    }
  }

  static async set(key, value, ttl = 3600) {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.warn('Cache set failed:', error);
    }
  }

  static async invalidate(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.warn('Cache invalidation failed:', error);
    }
  }

  static generateSearchKey(params) {
    const sortedParams = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "")
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});
    console.log(JSON.stringify(sortedParams))
  return `search:${JSON.stringify(sortedParams)}`;
  }
}

module.exports = CacheService;
