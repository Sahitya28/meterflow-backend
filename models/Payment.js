const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // Which user made this payment
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Which bill this payment is for
    billingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Billing",
      default: null,
    },

    // Razorpay order id - created before payment
    razorpayOrderId: {
      type: String,
      required: true,
    },

    // Razorpay payment id - received after payment
    razorpayPaymentId: {
      type: String,
      default: null,
    },

    // Razorpay signature - used to verify payment
    razorpaySignature: {
      type: String,
      default: null,
    },

    // Amount in paise (Razorpay uses smallest currency unit)
    // e.g. Rs 10 = 1000 paise
    amount: {
      type: Number,
      required: true,
    },

    // Currency
    currency: {
      type: String,
      default: "INR",
    },

    // Payment status
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },

    // What plan was purchased
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "pro",
    },

    // Payment description
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);