const express = require("express");
const router = express.Router();
const {
  getPlans,
  getSubscription,
  createOrder,
  verifyPayment,
  getPaymentHistory,
  cancelSubscription,
  createOrderForBill,
  verifyBillPayment,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

// Public route - anyone can see plans
router.get("/plans", getPlans);

// All other routes require login
router.use(protect);

router.get("/subscription", getSubscription);
router.post("/create-order", createOrder);
router.post("/verify", verifyPayment);
router.get("/history", getPaymentHistory);
router.post("/cancel", cancelSubscription);
router.post("/create-order-for-bill", createOrderForBill);
router.post("/verify-bill-payment", verifyBillPayment);


module.exports = router;