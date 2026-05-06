const mongoose = require("mongoose");
const crypto = require("crypto");

const apiKeySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Add this field after userId in the schema
    apiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Api",
      default: null, // null means it's a general key not tied to specific API
    },
    
    name: {
      type: String,
      required: [true, "API key name is required"],
      trim: true,
    },
    key: {
      type: String,
      unique: true,
    },
    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
    },
    rateLimit: {
      type: Number,
      default: 60, // 60 requests per minute
    },
    totalRequests: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-generate the API key before saving
apiKeySchema.pre("save", function (next) {
  if (!this.key) {
    const randomBytes = crypto.randomBytes(32).toString("hex");
    this.key = `mf_live_${randomBytes}`;
  }
  next();
});

module.exports = mongoose.model("ApiKey", apiKeySchema);