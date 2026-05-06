const express = require("express");
const router = express.Router();
const {
  getMyBills,
  calculateBill,
  getBillingSummary,
  markAsPaid,
} = require("../controllers/billingController");
const { protect } = require("../middleware/authMiddleware");

// All billing routes require login
router.use(protect);

router.get("/", getMyBills);
router.post("/calculate", calculateBill);
router.get("/summary", getBillingSummary);
router.post("/:id/pay", markAsPaid);

module.exports = router;