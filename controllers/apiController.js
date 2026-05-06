const Api = require("../models/Api");
const ApiKey = require("../models/ApiKey");

// POST /api/apis - Create a new API
const createApi = async (req, res) => {
  try {
    const { name, description, baseUrl, plan, freeLimit, pricePerHundred } = req.body;

    if (!name || !baseUrl) {
      return res.status(400).json({ message: "Name and Base URL are required" });
    }

    const api = await Api.create({
      userId: req.user.id,
      name,
      description,
      baseUrl,
      plan,
      freeLimit,
      pricePerHundred,
    });

    res.status(201).json({
      message: "API created successfully",
      api,
    });
  } catch (error) {
    console.error("Create API error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/apis - Get all APIs for logged in user
const getMyApis = async (req, res) => {
  try {
    const apis = await Api.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ apis });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/apis/:id - Get single API details
const getApiById = async (req, res) => {
  try {
    const api = await Api.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!api) {
      return res.status(404).json({ message: "API not found" });
    }

    // Also get all keys for this API
    const keys = await ApiKey.find({ apiId: req.params.id });

    res.status(200).json({ api, keys });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/apis/:id - Update API details
const updateApi = async (req, res) => {
  try {
    const api = await Api.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!api) {
      return res.status(404).json({ message: "API not found" });
    }

    const { name, description, baseUrl, status, plan, freeLimit, pricePerHundred } = req.body;

    // Only update fields that were sent
    if (name) api.name = name;
    if (description !== undefined) api.description = description;
    if (baseUrl) api.baseUrl = baseUrl;
    if (status) api.status = status;
    if (plan) api.plan = plan;
    if (freeLimit) api.freeLimit = freeLimit;
    if (pricePerHundred) api.pricePerHundred = pricePerHundred;

    await api.save();

    res.status(200).json({ message: "API updated successfully", api });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/apis/:id - Delete an API and all its keys
const AccessRequest = require("../models/AccessRequest"); // add this at top

const deleteApi = async (req, res) => {
  try {
    const api = await Api.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!api) {
      return res.status(404).json({ message: "API not found" });
    }

    // Delete all API keys linked to this API
    await ApiKey.deleteMany({ apiId: req.params.id });

    // Delete all access requests for this API
    await AccessRequest.deleteMany({ apiId: req.params.id });

    // Delete the API itself
    await api.deleteOne();

    res.status(200).json({
      message: "API and all related data deleted successfully",
    });
  } catch (error) {
    console.error("Delete API error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/apis/:id/keys - Generate a new key for a specific API
const generateKeyForApi = async (req, res) => {
  try {
    const api = await Api.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!api) {
      return res.status(404).json({ message: "API not found" });
    }

    const { name, rateLimit } = req.body;

    const apiKey = await ApiKey.create({
      userId: req.user.id,
      apiId: req.params.id,  // link key to this API
      name: name || `Key for ${api.name}`,
      rateLimit: rateLimit || 60,
    });

    res.status(201).json({
      message: "API key generated successfully",
      apiKey,
    });
  } catch (error) {
    console.error("Generate key error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createApi,
  getMyApis,
  getApiById,
  updateApi,
  deleteApi,
  generateKeyForApi,
};