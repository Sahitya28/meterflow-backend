const mongoose = require("mongoose");

// This stores every single request that goes through the gateway
const usageLogSchema = new mongoose.Schema(
  {
    // Which API key was used
    apiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApiKey",
      required: true,
    },

    // The actual key string (for quick lookup without joining)
    apiKey: {
      type: String,
      required: true,
    },

    // Which API was called
    apiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Api",
      required: true,
    },

    // Which user owns this key
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The endpoint that was hit e.g. /pokemon/pikachu
    endpoint: {
      type: String,
      required: true,
    },

    // HTTP method GET POST etc
    method: {
      type: String,
      default: "GET",
    },

    // Response status code from the external API
    statusCode: {
      type: Number,
      default: 200,
    },

    // How long the request took in milliseconds
    latency: {
      type: Number,
      default: 0,
    },

    // Was this request successful or not
    success: {
      type: Boolean,
      default: true,
    },

    // Any error message if request failed
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt will act as the request timestamp
  }
);

// Index for fast queries - we query by apiKey and userId a lot
usageLogSchema.index({ apiKey: 1 });
usageLogSchema.index({ userId: 1 });
usageLogSchema.index({ apiId: 1 });
usageLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("UsageLog", usageLogSchema);