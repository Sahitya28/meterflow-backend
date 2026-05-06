const User = require("../models/User");
const ApiKey = require("../models/ApiKey");
const Api = require("../models/Api");
const UsageLog = require("../models/UsageLog");
const Billing = require("../models/Billing");
const Payment = require("../models/Payment");
const Subscription = require("../models/Subscription");
const AccessRequest = require("../models/AccessRequest");
const bcrypt = require("bcryptjs");

// GET /api/user/profile - Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/user/profile - Update name or email
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if new email is already taken by someone else
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({
          message: "Email already in use by another account",
        });
      }
      user.email = email;
    }

    if (name) user.name = name;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/user/password - Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    // Get user with password field
    const user = await User.findById(req.user.id).select("+password");

    // Check current password is correct
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    // Set new password - pre save hook will hash it
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/user/account - Delete account and all related data
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    // Verify password before deleting
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Incorrect password. Account not deleted.",
      });
    }

    // Delete all user data in order

    // 1. Get all APIs owned by user
    const userApis = await Api.find({ userId });
    const apiIds = userApis.map((a) => a._id);

    // 2. Get all keys for those APIs
    const apiKeys = await ApiKey.find({ apiId: { $in: apiIds } });
    const apiKeyIds = apiKeys.map((k) => k._id);

    // 3. Delete usage logs
    await UsageLog.deleteMany({ apiKeyId: { $in: apiKeyIds } });

    // 4. Delete API keys
    await ApiKey.deleteMany({ apiId: { $in: apiIds } });

    // 5. Delete access requests
    await AccessRequest.deleteMany({
      $or: [{ ownerId: userId }, { consumerId: userId }],
    });

    // 6. Delete APIs
    await Api.deleteMany({ userId });

    // 7. Delete billing
    await Billing.deleteMany({ userId });

    // 8. Delete payments and subscription
    await Payment.deleteMany({ userId });
    await Subscription.deleteMany({ userId });

    // 9. Delete consumer keys
    await ApiKey.deleteMany({ userId });

    // 10. Finally delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      message: "Account and all related data deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
};