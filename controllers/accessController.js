const AccessRequest = require("../models/AccessRequest");
const Api = require("../models/Api");
const ApiKey = require("../models/ApiKey");
const User = require("../models/User");

// GET /api/access/apis - Consumer sees all available active APIs
const browseApis = async (req, res) => {
  try {
    // Get all active APIs with owner info
    const apis = await Api.find({ status: "active" })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    // For each API check if this consumer already requested access
    const consumerRequests = await AccessRequest.find({
      consumerId: req.user.id,
    });

    const requestMap = {};
    consumerRequests.forEach((r) => {
      requestMap[r.apiId.toString()] = r.status;
    });

    // Attach request status to each API
    const apisWithStatus = apis.map((api) => ({
      ...api.toObject(),
      requestStatus: requestMap[api._id.toString()] || null,
    }));

    res.status(200).json({ apis: apisWithStatus });
  } catch (error) {
    console.error("Browse APIs error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/access/request - Consumer requests access to an API
const requestAccess = async (req, res) => {
  try {
    const { apiId, reason } = req.body;

    const api = await Api.findById(apiId);
    if (!api) {
      return res.status(404).json({ message: "API not found" });
    }

    // Debug log - check what ownerId is being saved
    console.log("API found:", api.name);
    console.log("API ownerId:", api.userId);
    console.log("Consumer ID:", req.user.id);

    const existing = await AccessRequest.findOne({
      consumerId: req.user.id,
      apiId,
    });

    if (existing) {
      return res.status(400).json({
        message: `You already have a ${existing.status} request for this API`,
      });
    }

    const accessRequest = await AccessRequest.create({
      consumerId: req.user.id,
      apiId,
      ownerId: api.userId, // this must match the owner's user ID
      reason: reason || "",
    });

    console.log("Access request created:", accessRequest);

    res.status(201).json({
      message: "Access request sent to API owner",
      accessRequest,
    });
  } catch (error) {
    console.error("Request access error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/access/my-keys - Consumer sees their approved keys and usage
const getMyAccess = async (req, res) => {
  try {
    const approvedRequests = await AccessRequest.find({
      consumerId: req.user.id,
      status: "approved",
    })
      .populate("apiId", "name baseUrl description plan freeLimit")
      .populate("apiKeyId");

    res.status(200).json({ access: approvedRequests });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/access/my-requests - Consumer sees all their requests
const getMyRequests = async (req, res) => {
  try {
    const requests = await AccessRequest.find({ consumerId: req.user.id })
      .populate("apiId", "name description")
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/access/requests - Owner sees all requests for their APIs
const getIncomingRequests = async (req, res) => {
  try {
    console.log("Owner ID looking for requests:", req.user.id);

    const requests = await AccessRequest.find({ ownerId: req.user.id })
      .populate("consumerId", "name email role")
      .populate("apiId", "name baseUrl")
      .sort({ createdAt: -1 });

    console.log("Found requests:", requests.length);

    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const approveRequest = async (req, res) => {
  try {
    // Get rateLimit from request body - owner sets this
    const { rateLimit } = req.body;

    const request = await AccessRequest.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
    }).populate("consumerId", "name email");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: `Request is already ${request.status}`,
      });
    }

    // Use the rate limit passed by owner, default to 60
    const keyRateLimit = rateLimit && rateLimit > 0
      ? parseInt(rateLimit)
      : 60;

    console.log(
      `Approving request for ${request.consumerId.name} with rate limit: ${keyRateLimit}`
    );

    // Generate API key for the consumer with the correct rate limit
    const apiKey = await ApiKey.create({
      userId: request.consumerId._id,
      apiId: request.apiId,
      name: `Key for ${request.consumerId.name}`,
      rateLimit: keyRateLimit,
    });

    console.log(
      `Created key with rateLimit: ${apiKey.rateLimit}`
    );

    request.status = "approved";
    request.apiKeyId = apiKey._id;
    await request.save();

    res.status(200).json({
      message: `Access approved for ${request.consumerId.name}`,
      apiKey,
    });
  } catch (error) {
    console.error("Approve request error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/access/reject/:id - Owner rejects a request
const rejectRequest = async (req, res) => {
  try {
    const request = await AccessRequest.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = "rejected";
    await request.save();

    res.status(200).json({ message: "Request rejected" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/access/consumer-usage - Owner sees usage broken down by consumer
const getConsumerUsage = async (req, res) => {
  try {
    // Get all approved requests for owner's APIs
    const approvedRequests = await AccessRequest.find({
      ownerId: req.user.id,
      status: "approved",
    })
      .populate("consumerId", "name email")
      .populate("apiId", "name")
      .populate("apiKeyId");

    // Build usage summary per consumer
    const usageSummary = approvedRequests.map((req) => ({
      consumer: req.consumerId,
      api: req.apiId,
      key: req.apiKeyId
        ? {
            id: req.apiKeyId._id,
            status: req.apiKeyId.status,
            totalRequests: req.apiKeyId.totalRequests,
            lastUsedAt: req.apiKeyId.lastUsedAt,
            rateLimit: req.apiKeyId.rateLimit,
          }
        : null,
    }));

    res.status(200).json({ usage: usageSummary });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  browseApis,
  requestAccess,
  getMyAccess,
  getMyRequests,
  getIncomingRequests,
  approveRequest,
  rejectRequest,
  getConsumerUsage,
};