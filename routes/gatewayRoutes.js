const express = require("express");
const router = express.Router();
const { gatewayMiddleware } = require("../middleware/gatewayMiddleware");
const { handleGatewayRequest } = require("../controllers/gatewayController");

// All requests to /gateway/:apiId/* go through gateway middleware first
// The * wildcard captures everything after the apiId
// e.g. /gateway/abc123/pokemon/pikachu
router.all("/:apiId/*", gatewayMiddleware, handleGatewayRequest);

// Also handle requests with no path after apiId
router.all("/:apiId", gatewayMiddleware, handleGatewayRequest);

module.exports = router;