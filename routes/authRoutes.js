const express = require("express");
const router = express.Router();
const {
  register,
  login,
  refreshToken,
  logout,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", protect, logout);  // must be logged in to logout
router.get("/me", protect, getMe);        // get current user info

module.exports = router;