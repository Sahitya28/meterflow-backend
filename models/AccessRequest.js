const mongoose = require("mongoose");

// When a consumer wants access to an API they send a request
// The owner then approves or rejects it
const accessRequestSchema = new mongoose.Schema(
  {
    // Which consumer is requesting
    consumerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Which API they want access to
    apiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Api",
      required: true,
    },

    // Who owns this API
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Request status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // Why they want access
    reason: {
      type: String,
      default: "",
    },

    // The API key generated when approved
    apiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApiKey",
      default: null,
    },
  },
  { timestamps: true }
);

// One request per consumer per API
accessRequestSchema.index(
  { consumerId: 1, apiId: 1 },
  { unique: true }
);

module.exports = mongoose.model("AccessRequest", accessRequestSchema);