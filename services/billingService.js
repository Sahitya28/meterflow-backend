const UsageLog = require("../models/UsageLog");
const ApiKey = require("../models/ApiKey");
const Api = require("../models/Api");
const Billing = require("../models/Billing");

const PRICING = {
  freeLimit: 1000,
  pricePerHundred: 0.5,
};

const calculateBillForMonth = async (userId, apiId, year, month) => {
  try {
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);
    const billingMonth = `${year}-${String(month).padStart(2, "0")}`;

    const User = require("../models/User");
    const user = await User.findById(userId);

    let keyIds = [];

    if (user?.role === "api_owner" || user?.role === "admin") {
      // Owner sees ALL requests on their API
      const allApiKeys = await ApiKey.find({ apiId });
      keyIds = allApiKeys.map((k) => k._id);
    } else {
      // Consumer only sees their own keys
      const myKeys = await ApiKey.find({ userId, apiId });
      keyIds = myKeys.map((k) => k._id);
    }

    if (keyIds.length === 0) return null;

    const totalRequests = await UsageLog.countDocuments({
      apiKeyId: { $in: keyIds },
      createdAt: { $gte: periodStart, $lte: periodEnd },
    });

    const api = await Api.findById(apiId);
    if (!api) return null;

    const freeLimit = api?.freeLimit || 1000;
    const pricePerHundred = api?.pricePerHundred || 0.5;

    const freeRequests = Math.min(totalRequests, freeLimit);
    const billableRequests = Math.max(0, totalRequests - freeLimit);
    const amount = (billableRequests / 100) * pricePerHundred;
    const roundedAmount = Math.round(amount * 100) / 100;

    let status = "unpaid";
    if (billableRequests === 0) status = "free";

    const billing = await Billing.findOneAndUpdate(
      { userId, apiId, billingMonth },
      {
        userId,
        apiId,
        periodStart,
        periodEnd,
        totalRequests,
        freeRequests,
        billableRequests,
        pricePerHundred,
        amount: roundedAmount,
        status,
        billingMonth,
      },
      { upsert: true, new: true }
    );

    return billing;
  } catch (error) {
    console.error("Billing calculation error:", error.message);
    throw error;
  }
};

const calculateAllBillsForUser = async (userId) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const User = require("../models/User");
    const user = await User.findById(userId);

    let apiIds = [];

    if (user?.role === "api_owner" || user?.role === "admin") {
      // Owner - bill based on their own APIs
      const ownerApis = await Api.find({ userId });
      apiIds = ownerApis.map((a) => a._id.toString());
    } else {
      // Consumer - bill based on APIs they have keys for
      const userKeys = await ApiKey.find({
        userId,
        status: "active",
        apiId: { $ne: null },
      });
      apiIds = [
        ...new Set(userKeys.map((k) => k.apiId.toString())),
      ];
    }

    if (apiIds.length === 0) return [];

    const bills = await Promise.all(
      apiIds.map((apiId) =>
        calculateBillForMonth(userId, apiId, year, month)
      )
    );

    return bills.filter(Boolean);
  } catch (error) {
    console.error("Calculate all bills error:", error.message);
    throw error;
  }
};

// Get daily usage - for owners includes ALL keys on their APIs
const getUsageByDay = async (userId, year, month) => {
  try {
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    // Get all keys owned by this user
    const userKeys = await ApiKey.find({ userId });
    const keyIds = userKeys.map((k) => k._id);

    if (keyIds.length === 0) return [];

    const dailyUsage = await UsageLog.aggregate([
      {
        $match: {
          apiKeyId: { $in: keyIds },
          createdAt: { $gte: periodStart, $lte: periodEnd },
        },
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: "$createdAt" },
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: ["$success", 1, 0] },
          },
          failedCount: {
            $sum: { $cond: ["$success", 0, 1] },
          },
          avgLatency: { $avg: "$latency" },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]);

    return dailyUsage;
  } catch (error) {
    console.error("Get usage by day error:", error.message);
    throw error;
  }
};

module.exports = {
  calculateBillForMonth,
  calculateAllBillsForUser,
  getUsageByDay,
};