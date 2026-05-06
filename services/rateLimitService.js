const getRedis = () => {
  try {
    return require("../config/redis");
  } catch {
    return null;
  }
};

const checkRateLimit = async (apiKeyId, rateLimit = 10) => {
  const redis = getRedis();

  if (!redis) {
    return {
      isAllowed: true,
      currentCount: 0,
      limit: rateLimit,
      remaining: rateLimit,
      resetInSeconds: 60,
    };
  }

  try {
    const redisKey = `ratelimit:${apiKeyId}`;
    const currentCount = await redis.incr(redisKey);

    if (currentCount === 1) {
      await redis.expire(redisKey, 60);
    }

    const ttl = await redis.ttl(redisKey);

    return {
      isAllowed: currentCount <= rateLimit,
      currentCount,
      limit: rateLimit,
      remaining: Math.max(0, rateLimit - currentCount),
      resetInSeconds: ttl,
    };
  } catch (error) {
    console.error("Rate limit error:", error);

    return {
      isAllowed: true,
      currentCount: 0,
      limit: rateLimit,
      remaining: rateLimit,
      resetInSeconds: 60,
    };
  }
};

const getCurrentUsage = async (apiKeyId) => {
  const redis = getRedis();
  if (!redis) return 0;

  try {
    const currentMinute = Math.floor(Date.now() / 60000);
    const redisKey = `ratelimit:${apiKeyId}:${currentMinute}`;
    const count = await redis.get(redisKey);
    return parseInt(count) || 0;
  } catch (error) {
    return 0;
  }
};

const resetRateLimit = async (apiKeyId) => {
  const redis = getRedis();
  if (!redis) return true;

  try {
    const currentMinute = Math.floor(Date.now() / 60000);
    const redisKey = `ratelimit:${apiKeyId}:${currentMinute}`;
    await redis.del(redisKey);
    return true;
  } catch (error) {
    return false;
  }
};

const cacheApiKey = async (keyValue, apiKeyData) => {
  const redis = getRedis();
  if (!redis) return;

  try {
    const redisKey = `apikey:${keyValue}`;
    await redis.setex(redisKey, 300, JSON.stringify(apiKeyData));
  } catch (error) {
    console.error("Cache API key error:", error.message);
  }
};

const getCachedApiKey = async (keyValue) => {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const redisKey = `apikey:${keyValue}`;
    const cached = await redis.get(redisKey);
    if (cached) return JSON.parse(cached);
    return null;
  } catch (error) {
    return null;
  }
};

const invalidateApiKeyCache = async (keyValue) => {
  const redis = getRedis();
  if (!redis) return;

  try {
    const redisKey = `apikey:${keyValue}`;
    await redis.del(redisKey);
  } catch (error) {
    console.error("Invalidate cache error:", error.message);
  }
};

module.exports = {
  checkRateLimit,
  getCurrentUsage,
  resetRateLimit,
  cacheApiKey,
  getCachedApiKey,
  invalidateApiKeyCache,
};