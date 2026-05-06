const mongoose = require("mongoose");

const apiSchema = new mongoose.Schema(
  {
    // The user who created this API
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Name of the API (e.g. "Weather API", "Pokemon API")
    name: {
      type: String,
      required: [true, "API name is required"],
      trim: true,
    },

    // Description of what this API does
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // The actual external URL this API proxies to
    // e.g. https://pokeapi.co/api/v2
    baseUrl: {
      type: String,
      required: [true, "Base URL is required"],
      trim: true,
    },

    // Is this API active or disabled
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    // Pricing plan for this API
    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },

    // Free tier request limit
    freeLimit: {
      type: Number,
      default: 1000, // 1000 free requests
    },

    // Price per 100 requests after free tier (in rupees)
    pricePerHundred: {
      type: Number,
      default: 0.5, // ₹0.5 per 100 requests
    },

    // Total requests made to this API across all keys
    totalRequests: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Api", apiSchema);