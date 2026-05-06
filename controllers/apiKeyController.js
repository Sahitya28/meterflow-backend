const ApiKey = require("../models/ApiKey");
const { invalidateApiKeyCache } = require("../services/rateLimitService");

// POST /api/keys - Create a new API key
const createApiKey = async (req, res) => {
  try {
    const { name, rateLimit } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Key name is required" });
    }

    const apiKey = await ApiKey.create({
      userId: req.user.id,
      name,
      rateLimit: rateLimit || 60,
    });

    res.status(201).json({
      message: "API key created successfully",
      apiKey,
    });
  } catch (error) {
    console.error("Create API key error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/keys - Get all keys for logged in user
const getMyApiKeys = async (req, res) => {
  try {
    const keys = await ApiKey.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ keys });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/keys/:id - Revoke an API key
const revokeApiKey = async (req, res) => {
  try {
    const key = await ApiKey.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!key) {
      return res.status(404).json({ message: "API key not found" });
    }

    key.status = "revoked";
    await key.save();

    // Remove from Redis cache so gateway picks up the revoked status
    await invalidateApiKeyCache(key.key);

    res.status(200).json({ message: "API key revoked successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/keys/:id/rotate - Generate new key value
const rotateApiKey = async (req, res) => {
  try {
    const key = await ApiKey.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!key) {
      return res.status(404).json({ message: "API key not found" });
    }

    // Remove old key from Redis cache before rotating
    await invalidateApiKeyCache(key.key);

    // Clear key so pre-save hook generates a new one
    key.key = undefined;
    await key.save();

    res.status(200).json({
      message: "API key rotated successfully",
      apiKey: key,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createApiKey, getMyApiKeys, revokeApiKey, rotateApiKey };