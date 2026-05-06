const express = require("express");
const router = express.Router();
const ApiKey = require("../models/ApiKey");
const Api = require("../models/Api");
const {
  createApiKey,
  getMyApiKeys,
  revokeApiKey,
  rotateApiKey,
} = require("../controllers/apiKeyController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { getCurrentUsage } = require("../services/rateLimitService");

router.use(protect);

// GET /api/keys - Get all keys
// Owner gets all keys on their APIs + their own keys
// Consumer gets only their own keys
router.get("/", async (req, res) => {
  try {
    let keys = [];

    if (req.user.role === "api_owner" || req.user.role === "admin") {
      // Get owner's APIs
      const ownerApis = await Api.find({ userId: req.user.id });
      const apiIds = ownerApis.map((a) => a._id);

      // Get all keys on those APIs
      const apiKeys = await ApiKey.find({
        apiId: { $in: apiIds },
      }).populate("apiId", "name");

      // Also get owner's direct keys
      const directKeys = await ApiKey.find({
        userId: req.user.id,
      }).populate("apiId", "name");

      // Merge and deduplicate
      const allKeys = [...apiKeys, ...directKeys];
      const seen = new Set();
      keys = allKeys.filter((k) => {
        const id = k._id.toString();
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    } else {
      // Consumer only sees their own keys
      keys = await ApiKey.find({
        userId: req.user.id,
      }).populate("apiId", "name");
    }

    // Sort newest first
    keys.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.status(200).json({ keys });
  } catch (error) {
    console.error("Get keys error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", authorize("api_owner", "admin"), createApiKey);
router.delete("/:id", revokeApiKey);
router.post("/:id/rotate", rotateApiKey);

// GET /api/keys/:id/usage - Get real time rate limit usage
router.get("/:id/usage", async (req, res) => {
  try {
    // Find key - allow both owner and consumer to check
    const key = await ApiKey.findById(req.params.id);

    if (!key) {
      return res.status(404).json({ message: "Key not found" });
    }

    let currentUsage = 0;
    try {
      currentUsage = await getCurrentUsage(key._id.toString());
    } catch (redisError) {
      currentUsage = 0;
    }

    res.status(200).json({
      keyId: key._id,
      name: key.name,
      rateLimit: key.rateLimit,
      currentUsage,
      remaining: Math.max(0, key.rateLimit - currentUsage),
      totalRequests: key.totalRequests,
    });
  } catch (error) {
    console.error("Usage route error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;