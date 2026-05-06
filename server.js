const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

// Allow requests from frontend URL in production
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL, // your Vercel URL
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many attempts, please try again later.",
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// General limiter
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: "Too many requests, slow down.",
});
app.use("/api/", generalLimiter);

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/keys", require("./routes/apiKeyRoutes"));
app.use("/api/apis", require("./routes/apiRoutes"));
app.use("/api/usage", require("./routes/usageRoutes"));
app.use("/api/billing", require("./routes/billingRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/access", require("./routes/accessRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/gateway", require("./routes/gatewayRoutes"));

app.get("/", (req, res) => {
  res.json({ message: "MeterFlow API is running ✅" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ message: "Something went wrong" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});