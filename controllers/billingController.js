const Billing = require("../models/Billing");
const {
  calculateAllBillsForUser,
  calculateBillForMonth,
  getUsageByDay,
} = require("../services/billingService");

// GET /api/billing - Get all bills for logged in user
const getMyBills = async (req, res) => {
  try {
    const bills = await Billing.find({ userId: req.user.id })
      .sort({ billingMonth: -1 })
      .populate("apiId", "name baseUrl");

    res.status(200).json({ bills });
  } catch (error) {
    console.error("Get bills error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/billing/calculate - Calculate current month bill
const calculateBill = async (req, res) => {
  try {
    const bills = await calculateAllBillsForUser(req.user.id);

    res.status(200).json({
      message: "Bills calculated successfully",
      bills,
    });
  } catch (error) {
    console.error("Calculate bill error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const getBillingSummary = async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const billingMonth = `${year}-${String(month).padStart(2, "0")}`;

    // Auto calculate bills for this user
    await calculateAllBillsForUser(req.user.id);

    // Get current month bills for this user
    const currentBills = await Billing.find({
      userId: req.user.id,
      billingMonth,
    }).populate("apiId", "name");

    const totalAmount = currentBills.reduce(
      (sum, bill) => sum + bill.amount,
      0
    );
    const totalRequests = currentBills.reduce(
      (sum, bill) => sum + bill.totalRequests,
      0
    );
    const totalBillableRequests = currentBills.reduce(
      (sum, bill) => sum + bill.billableRequests,
      0
    );
    const totalFreeRequests = currentBills.reduce(
      (sum, bill) => sum + bill.freeRequests,
      0
    );

    const dailyUsage = await getUsageByDay(req.user.id, year, month);

    res.status(200).json({
      billingMonth,
      currentBills,
      summary: {
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalRequests,
        totalBillableRequests,
        totalFreeRequests,
      },
      dailyUsage,
    });
  } catch (error) {
    console.error("Billing summary error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/billing/:id/pay - Mark a bill as paid (simulated)
const markAsPaid = async (req, res) => {
  try {
    const bill = await Billing.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.status === "free") {
      return res.status(400).json({ message: "This bill is already free" });
    }

    bill.status = "paid";
    await bill.save();

    res.status(200).json({
      message: "Bill marked as paid",
      bill,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getMyBills,
  calculateBill,
  getBillingSummary,
  markAsPaid,
};