const express = require("express");
const router = express.Router();
const {
  createApi,
  getMyApis,
  getApiById,
  updateApi,
  deleteApi,
  generateKeyForApi,
} = require("../controllers/apiController");
const { protect, authorize } = require("../middleware/authMiddleware");

// All routes require login and api_owner or admin role
router.use(protect);
router.use(authorize("api_owner", "admin"));

router.post("/", createApi);
router.get("/", getMyApis);
router.get("/:id", getApiById);
router.put("/:id", updateApi);
router.delete("/:id", deleteApi);
router.post("/:id/keys", generateKeyForApi);

module.exports = router;