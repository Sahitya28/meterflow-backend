const express = require("express");
const router = express.Router();
const {
  browseApis,
  requestAccess,
  getMyAccess,
  getMyRequests,
  getIncomingRequests,
  approveRequest,
  rejectRequest,
  getConsumerUsage,
} = require("../controllers/accessController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

// Consumer routes
router.get("/apis", authorize("consumer"), browseApis);
router.post("/request", authorize("consumer"), requestAccess);
router.get("/my-access", authorize("consumer"), getMyAccess);
router.get("/my-requests", authorize("consumer"), getMyRequests);

// Owner routes
router.get("/requests", authorize("api_owner", "admin"), getIncomingRequests);
router.post("/approve/:id", authorize("api_owner", "admin"), approveRequest);
router.post("/reject/:id", authorize("api_owner", "admin"), rejectRequest);
router.get("/consumer-usage", authorize("api_owner", "admin"), getConsumerUsage);

module.exports = router;