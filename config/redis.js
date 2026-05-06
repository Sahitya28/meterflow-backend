let redis = null;

try {
  const Redis = require("ioredis");

  // Only connect if Redis URL is provided
  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    redis = new Redis(
      process.env.REDIS_URL || {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 300, 3000);
        },
      }
    );

    redis.on("connect", () => {
      console.log("✅ Redis connected");
    });

    redis.on("error", (err) => {
      console.error("❌ Redis error:", err.message);
      redis = null; // disable redis on error
    });
  } else {
    console.log("⚠️ Redis not configured - rate limiting will use MongoDB fallback");
  }
} catch (error) {
  console.log("⚠️ Redis not available:", error.message);
}

module.exports = redis;