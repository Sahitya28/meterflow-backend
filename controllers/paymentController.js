const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const Payment = require("../models/Payment");
const Subscription = require("../models/Subscription");
const Billing = require("../models/Billing");
const PLANS = require("../config/plans");

// GET /api/payments/plans - Get all available plans
const getPlans = async (req, res) => {
  try {
    res.status(200).json({ plans: PLANS });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/payments/subscription - Get current user subscription
const getSubscription = async (req, res) => {
  try {
    let subscription = await Subscription.findOne({
      userId: req.user.id,
    });

    // If no subscription found create a free one
    if (!subscription) {
      subscription = await Subscription.create({
        userId: req.user.id,
        plan: "free",
        planDetails: {
          freeLimit: PLANS.free.freeLimit,
          pricePerHundred: PLANS.free.pricePerHundred,
          monthlyPrice: PLANS.free.price,
        },
      });
    }

    res.status(200).json({ subscription });
  } catch (error) {
    console.error("Get subscription error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/payments/create-order - Create Razorpay order
const createOrder = async (req, res) => {
  try {
    const { plan, billingId } = req.body;

    if (!PLANS[plan]) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    if (plan === "free") {
      return res.status(400).json({
        message: "Cannot create payment for free plan",
      });
    }

    // Check keys exist before calling Razorpay
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("❌ Razorpay keys missing from .env");
      return res.status(500).json({ message: "Payment not configured" });
    }

    const planDetails = PLANS[plan];
    const amountInPaise = planDetails.price * 100;

    console.log("Creating order for plan:", plan, "amount:", amountInPaise);

    // Create order with full error capture
    let order;
    try {
      order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
        notes: {
          userId: req.user.id.toString(),
          plan: plan,
        },
      });
      console.log("✅ Razorpay order created:", order.id);
    } catch (razorpayError) {
      // Razorpay errors are objects not standard JS errors
      console.error("❌ Razorpay error:", JSON.stringify(razorpayError));
      return res.status(500).json({
        message: "Razorpay order creation failed",
        detail: JSON.stringify(razorpayError),
      });
    }

    const payment = await Payment.create({
      userId: req.user.id,
      billingId: billingId || null,
      razorpayOrderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      plan: plan,
      description: `${planDetails.name} Plan - Monthly Subscription`,
    });

    res.status(201).json({
      orderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      plan: planDetails,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("Create order error:", error?.message || JSON.stringify(error));
    res.status(500).json({ message: "Failed to create payment order" });
  }
};

// POST /api/payments/verify - Verify payment after Razorpay callback
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
      paymentId,
    } = req.body;

    // Step 1 - Verify signature
    // Razorpay sends a signature we can verify to confirm payment is real
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // Step 2 - Update payment record
    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "paid",
      },
      { new: true }
    );

    // Step 3 - Update or create subscription
    const planDetails = PLANS[plan];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month from now

    await Subscription.findOneAndUpdate(
      { userId: req.user.id },
      {
        plan: plan,
        planDetails: {
          freeLimit: planDetails.freeLimit,
          pricePerHundred: planDetails.pricePerHundred,
          monthlyPrice: planDetails.price,
        },
        status: "active",
        startDate: new Date(),
        endDate: endDate,
        lastPaymentId: payment._id,
      },
      { upsert: true, new: true }
    );

    // Step 4 - If this payment was for a specific bill, mark it paid
    if (payment.billingId) {
      await Billing.findByIdAndUpdate(payment.billingId, {
        status: "paid",
      });
    }

    res.status(200).json({
      message: "Payment verified successfully",
      plan: planDetails,
    });
  } catch (error) {
    console.error("Verify payment error:", error.message);
    res.status(500).json({ message: "Payment verification failed" });
  }
};

// GET /api/payments/history - Get payment history for user
const getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("billingId", "billingMonth totalRequests");

    res.status(200).json({ payments });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/payments/cancel - Cancel subscription (downgrade to free)
const cancelSubscription = async (req, res) => {
  try {
    await Subscription.findOneAndUpdate(
      { userId: req.user.id },
      {
        plan: "free",
        planDetails: {
          freeLimit: PLANS.free.freeLimit,
          pricePerHundred: PLANS.free.pricePerHundred,
          monthlyPrice: PLANS.free.price,
        },
        status: "cancelled",
        endDate: new Date(),
      }
    );

    res.status(200).json({
      message: "Subscription cancelled. Downgraded to free plan.",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/payments/create-order-for-bill
const createOrderForBill = async (req, res) => {
  try {
    const { billId, amount } = req.body;

    if (!billId || !amount) {
      return res.status(400).json({
        message: "Bill ID and amount are required",
      });
    }

    // Minimum amount is ₹1 = 100 paise
    const finalAmount = Math.max(amount, 100);

    const order = await razorpay.orders.create({
      amount: finalAmount,
      currency: "INR",
      receipt: `bill_${Date.now()}`,
      notes: {
        userId: req.user.id.toString(),
        billId: billId,
      },
    });

    const payment = await Payment.create({
      userId: req.user.id,
      billingId: billId,
      razorpayOrderId: order.id,
      amount: finalAmount,
      currency: "INR",
      plan: "pro",
      description: "API Usage Bill Payment",
    });

    res.status(201).json({
      orderId: order.id,
      amount: finalAmount,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error(
      "Create order for bill error:",
      JSON.stringify(error)
    );
    res.status(500).json({ message: "Failed to create payment order" });
  }
};

// POST /api/payments/verify-bill-payment
const verifyBillPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      billId,
      paymentId,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ message: "Payment verification failed" });
    }

    // Update payment record
    await Payment.findByIdAndUpdate(paymentId, {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: "paid",
    });

    // Mark bill as paid
    await Billing.findByIdAndUpdate(billId, { status: "paid" });

    res.status(200).json({
      message: "Bill payment verified successfully",
    });
  } catch (error) {
    console.error("Verify bill payment error:", error.message);
    res.status(500).json({ message: "Payment verification failed" });
  }
};

module.exports = {
  getPlans,
  getSubscription,
  createOrder,
  verifyPayment,
  getPaymentHistory,
  cancelSubscription,
  createOrderForBill,  
  verifyBillPayment,
};