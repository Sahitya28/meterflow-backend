const axios = require("axios");
const { logRequest } = require("../middleware/gatewayMiddleware");

const handleGatewayRequest = async (req, res) => {
  const { apiKey, api, startTime } = req;

  // Get everything after /gateway/:apiId
  const fullPath = req.originalUrl;
  const gatewayPrefix = `/gateway/${req.params.apiId}`;
  let endpoint = fullPath.replace(gatewayPrefix, "");

  // Remove leading slash for building target URL
  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint.slice(1)
    : endpoint;

  const method = req.method.toLowerCase();

  try {
    // Build target URL correctly without double slashes
    const baseUrl = api.baseUrl.endsWith("/")
      ? api.baseUrl.slice(0, -1)
      : api.baseUrl;

    const targetUrl = cleanEndpoint
      ? `${baseUrl}/${cleanEndpoint}`
      : baseUrl;

    console.log(`Gateway forwarding: ${method.toUpperCase()} ${targetUrl}`);

    const response = await axios({
      method: method,
      url: targetUrl,
      params: req.query,
      data: req.body,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    const latency = Date.now() - startTime;

    // Log the request
    await logRequest({
      apiKey,
      api,
      endpoint: endpoint || "/",
      method: req.method,
      statusCode: response.status,
      latency,
      success: true,
      errorMessage: null,
    });

    res.set("X-MeterFlow-Latency", `${latency}ms`);
    res.set("X-MeterFlow-Requests-Used", apiKey.totalRequests);
    res.status(response.status).json(response.data);

  } catch (error) {
    const latency = Date.now() - startTime;

    let statusCode = 500;
    let errorMessage = "Gateway request failed";

    if (error.response) {
      statusCode = error.response.status;
      errorMessage = `External API error: ${statusCode}`;
    } else if (error.code === "ECONNABORTED") {
      statusCode = 504;
      errorMessage = "Request timed out";
    } else if (error.code === "ENOTFOUND") {
      statusCode = 502;
      errorMessage = "Could not reach external API";
    }

    await logRequest({
      apiKey,
      api,
      endpoint: endpoint || "/",
      method: req.method,
      statusCode,
      latency,
      success: false,
      errorMessage,
    });

    res.status(statusCode).json({
      message: errorMessage,
      error: error.response?.data || error.message,
    });
  }
};

module.exports = { handleGatewayRequest };