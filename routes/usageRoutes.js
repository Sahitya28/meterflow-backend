const express = require("express");
const router = express.Router();
const UsageLog = require("../models/UsageLog");
const ApiKey = require("../models/ApiKey");
const Api = require("../models/Api");
const { protect } = require("../middleware/authMiddleware");

// Get all relevant key IDs based on role
const getKeyIds = async (userId, role) => {
  if (role === "api_owner" || role === "admin") {
    // Owner sees ALL requests on their APIs
    // including requests made by consumers
    const ownerApis = await Api.find({ userId });
    const apiIds = ownerApis.map((a) => a._id);

    // Get all keys linked to owner's APIs
    const apiLinkedKeys = await ApiKey.find({
      apiId: { $in: apiIds },
    });

    // Also get owner's own direct keys
    const directKeys = await ApiKey.find({ userId });

    // Merge and deduplicate
    const allKeys = [...apiLinkedKeys, ...directKeys];
    const uniqueIds = [
      ...new Map(
        allKeys.map((k) => [k._id.toString(), k._id])
      ).values(),
    ];

    return uniqueIds;
  } else {
    // Consumer only sees their own keys
    const myKeys = await ApiKey.find({ userId });
    return myKeys.map((k) => k._id);
  }
};

// GET /api/usage
router.get("/", protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const keyIds = await getKeyIds(req.user.id, req.user.role);

    if (keyIds.length === 0) {
      return res.status(200).json({
        logs: [],
        pagination: { total: 0, page: 1, pages: 0, limit },
      });
    }

    const total = await UsageLog.countDocuments({
      apiKeyId: { $in: keyIds },
    });

    const logs = await UsageLog.find({
      apiKeyId: { $in: keyIds },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("apiId", "name");

    res.status(200).json({
      logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("Usage logs error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/usage/stats
router.get("/stats", protect, async (req, res) => {
  try {
    const keyIds = await getKeyIds(req.user.id, req.user.role);

    if (keyIds.length === 0) {
      return res.status(200).json({
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        avgLatency: 0,
        requestsToday: 0,
      });
    }

    const [
      totalRequests,
      successRequests,
      failedRequests,
      latencyResult,
      requestsToday,
    ] = await Promise.all([
      UsageLog.countDocuments({ apiKeyId: { $in: keyIds } }),

      UsageLog.countDocuments({
        apiKeyId: { $in: keyIds },
        success: true,
      }),

      UsageLog.countDocuments({
        apiKeyId: { $in: keyIds },
        success: false,
      }),

      UsageLog.aggregate([
        { $match: { apiKeyId: { $in: keyIds } } },
        {
          $group: {
            _id: null,
            avgLatency: { $avg: "$latency" },
          },
        },
      ]),

      UsageLog.countDocuments({
        apiKeyId: { $in: keyIds },
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
    ]);

    res.status(200).json({
      totalRequests,
      successRequests,
      failedRequests,
      avgLatency: Math.round(latencyResult[0]?.avgLatency || 0),
      requestsToday,
    });
  } catch (error) {
    console.error("Stats error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;