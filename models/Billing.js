const mongoose = require("mongoose");

const billingSchema = new mongoose.Schema(
  {
    // Which user this bill belongs to
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Which API this bill is for
    apiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Api",
      required: true,
    },

    // Billing period
    periodStart: {
      type: Date,
      required: true,
    },

    periodEnd: {
      type: Date,
      required: true,
    },

    // Request counts
    totalRequests: {
      type: Number,
      default: 0,
    },

    // How many were in the free tier
    freeRequests: {
      type: Number,
      default: 0,
    },

    // How many were billable (over free limit)
    billableRequests: {
      type: Number,
      default: 0,
    },

    // Price per 100 requests used for this bill
    pricePerHundred: {
      type: Number,
      default: 0.5,
    },

    // Final amount in rupees
    amount: {
      type: Number,
      default: 0,
    },

    // Payment status
    status: {
      type: String,
      enum: ["unpaid", "paid", "free"],
      default: "unpaid",
    },

    // Month and year for easy querying e.g "2026-04"
    billingMonth: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// One bill per user per API per month
billingSchema.index(
  { userId: 1, apiId: 1, billingMonth: 1 },
  { unique: true }
);

module.exports = mongoose.model("Billing", billingSchema);