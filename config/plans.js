// Subscription plans config
// All prices in rupees
const PLANS = {
  free: {
    name: "Free",
    price: 0,           // Rs 0/month
    freeLimit: 1000,    // 1000 free requests
    pricePerHundred: 0, // no charges
    rateLimit: 60,      // 60 req/min
    features: [
      "1,000 requests/month",
      "1 API",
      "60 requests/minute",
      "Basic analytics",
    ],
  },

  pro: {
    name: "Pro",
    price: 999,           // Rs 999/month
    freeLimit: 10000,     // 10,000 free requests
    pricePerHundred: 0.5, // Rs 0.5 per 100 after free limit
    rateLimit: 300,       // 300 req/min
    features: [
      "10,000 requests/month included",
      "Unlimited APIs",
      "300 requests/minute",
      "Advanced analytics",
      "Priority support",
      "₹0.50 per 100 extra requests",
    ],
  },

  enterprise: {
    name: "Enterprise",
    price: 4999,          // Rs 4999/month
    freeLimit: 100000,    // 100,000 free requests
    pricePerHundred: 0.3, // Rs 0.3 per 100 after free limit
    rateLimit: 1000,      // 1000 req/min
    features: [
      "100,000 requests/month included",
      "Unlimited APIs",
      "1000 requests/minute",
      "Full analytics",
      "Dedicated support",
      "₹0.30 per 100 extra requests",
      "Custom rate limits",
    ],
  },
};

module.exports = PLANS;