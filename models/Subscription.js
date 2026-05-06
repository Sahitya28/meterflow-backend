const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one subscription per user
    },

    // Current plan
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },

    // Plan details
    planDetails: {
      freeLimit: { type: Number, default: 1000 },
      pricePerHundred: { type: Number, default: 0 },
      monthlyPrice: { type: Number, default: 0 },
    },

    // Subscription status
    status: {
      type: String,
      enum: ["active", "cancelled", "expired"],
      default: "active",
    },

    // When current plan started
    startDate: {
      type: Date,
      default: Date.now,
    },

    // When current plan ends
    endDate: {
      type: Date,
      default: null,
    },

    // Last payment id
    lastPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);