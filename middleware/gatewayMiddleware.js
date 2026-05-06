const mongoose = require("mongoose");
const ApiKey = require("../models/ApiKey");
const Api = require("../models/Api");
const UsageLog = require("../models/UsageLog");
const {
  checkRateLimit,
  cacheApiKey,
  getCachedApiKey,
} = require("../services/rateLimitService");

const gatewayMiddleware = async (req, res, next) => {
  const startTime = Date.now();

  try {
    // Step 1 - Get API key from header
    const keyValue = req.headers["x-api-key"];

    if (!keyValue) {
      return res.status(401).json({
        message: "API key missing. Send your key in x-api-key header.",
      });
    }

    // Step 2 - Always get from MongoDB for fresh data
    // Don't use Redis cache as it causes ObjectId issues
    const apiKey = await ApiKey.findOne({ key: keyValue }).lean();

    if (!apiKey) {
      return res.status(401).json({ message: "Invalid API key." });
    }

    // Step 3 - Check if key is active
    if (apiKey.status === "revoked") {
      return res.status(403).json({
        message: "This API key has been revoked.",
      });
    }

    // Step 4 - Find the API
    const apiIdFromUrl = req.params.apiId;
    let api;

    if (apiKey.apiId) {
      api = await Api.findById(apiKey.apiId).lean();
      if (
        api &&
        apiIdFromUrl &&
        api._id.toString() !== apiIdFromUrl
      ) {
        return res.status(403).json({
          message: "This API key does not belong to this API.",
        });
      }
    } else {
      api = await Api.findById(apiIdFromUrl).lean();
    }

    if (!api) {
      return res.status(404).json({ message: "API not found." });
    }

    // Step 5 - Check if API is active
    if (api.status === "inactive") {
      return res.status(403).json({
        message: "This API is currently inactive.",
      });
    }

    // Step 6 - Check rate limit
    const rateLimitResult = await checkRateLimit(
      apiKey._id.toString(),
      apiKey.rateLimit
    );

    res.set("X-RateLimit-Limit", apiKey.rateLimit);
    res.set("X-RateLimit-Remaining", rateLimitResult.remaining);
    res.set("X-RateLimit-Reset", rateLimitResult.resetInSeconds);

    if (!rateLimitResult.isAllowed) {
      return res.status(429).json({
        message: `Rate limit exceeded. Max ${apiKey.rateLimit} requests per minute.`,
        limit: rateLimitResult.limit,
        remaining: 0,
        retryAfter: `${rateLimitResult.resetInSeconds} seconds`,
      });
    }

    // Step 6.5 - Check free tier usage
    // Count total requests this month for this user
    const now = new Date();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const monthlyRequests = await UsageLog.countDocuments({
      apiKeyId: apiKey._id,
      createdAt: { $gte: monthStart },
    });

    const freeLimit = api.freeLimit || 1000;
    const isOverFreeLimit = monthlyRequests >= freeLimit;

    // Add free tier headers so consumer knows their usage
    res.set("X-Free-Limit", freeLimit);
    res.set("X-Free-Used", monthlyRequests);
    res.set(
      "X-Free-Remaining",
      Math.max(0, freeLimit - monthlyRequests)
    );

    // If over free limit add warning header but still allow request
    if (isOverFreeLimit) {
      res.set("X-Billing-Warning", "Free tier exhausted - charges apply");
      console.log(
        `⚠️ Free tier exhausted for key ${apiKey._id} - ${monthlyRequests} requests this month`
      );
    }

    // Step 7 - Update key stats
    await ApiKey.updateOne(
      { _id: apiKey._id },
      {
        $inc: { totalRequests: 1 },
        $set: { lastUsedAt: new Date() },
      }
    );

    // Step 8 - Update API total requests
    await Api.updateOne(
      { _id: api._id },
      { $inc: { totalRequests: 1 } }
    );

    // Step 9 - Attach to request
    req.apiKey = apiKey;
    req.api = api;
    req.startTime = startTime;
    req.rateLimitInfo = rateLimitResult;

    next();
  } catch (error) {
    console.error("Gateway middleware error:", error.message);
    res.status(500).json({ message: "Gateway error" });
  }
};

// Log request to MongoDB
const logRequest = async ({
  apiKey,
  api,
  endpoint,
  method,
  statusCode,
  latency,
  success,
  errorMessage,
}) => {
  try {
    // Convert string IDs to ObjectIds if needed
    const apiKeyId = mongoose.Types.ObjectId.isValid(apiKey._id)
      ? new mongoose.Types.ObjectId(apiKey._id.toString())
      : apiKey._id;

    const apiId = mongoose.Types.ObjectId.isValid(api._id)
      ? new mongoose.Types.ObjectId(api._id.toString())
      : api._id;

    const userId = mongoose.Types.ObjectId.isValid(apiKey.userId)
      ? new mongoose.Types.ObjectId(apiKey.userId.toString())
      : apiKey.userId;

    console.log("=== Saving log ===");
    console.log("apiKeyId:", apiKeyId);
    console.log("userId:", userId);
    console.log("endpoint:", endpoint);

    const log = await UsageLog.create({
      apiKeyId,
      apiKey: apiKey.key,
      apiId,
      userId,
      endpoint,
      method,
      statusCode,
      latency,
      success,
      errorMessage,
    });

    console.log("✅ Log saved:", log._id);
  } catch (error) {
    console.error("❌ Failed to log request:", error.message);
    console.error("❌ Full error:", error);
  }
};

module.exports = { gatewayMiddleware, logRequest };