# Apilio — Usage-Based API Billing Platform

> One platform for API owners and developers. Publish APIs, manage access, track every request, and handle billing automatically.

![Apilio](https://img.shields.io/badge/Apilio-API%20Billing%20Platform-indigo)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-19-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)

---

## 🌐 Live Demo

| Service | URL |
|---|---|
| Frontend | https://apilio.vercel.app |
| Backend API | https://apilio-backend.onrender.com |

---

## 📌 What is Apilio?

Apilio is a full-stack SaaS platform that lets you:

**As an API Owner:**
- Register your API and set pricing plans
- Approve or reject developer access requests
- Set custom rate limits per developer
- Monitor all requests made to your APIs
- View usage billing automatically calculated

**As a Developer (Consumer):**
- Browse available APIs on the platform
- Request access with a reason
- Get API keys approved instantly
- Test APIs in the built-in playground
- Track your usage and pay bills via Razorpay

---

## 🏗️ System Architecture

```
Developer sends request
        ↓
Apilio Gateway (Express)
        ↓
┌───────────────────────┐
│  1. Validate API Key  │ ← MongoDB / Redis cache
│  2. Check Rate Limit  │ ← Redis counter
│  3. Log Request       │ ← MongoDB UsageLog
│  4. Forward Request   │ ← Axios to external API
│  5. Return Response   │
└───────────────────────┘
        ↓
Monthly billing calculated automatically
        ↓
Developer pays via Razorpay
```

---

## 🧱 Tech Stack

### Frontend
| Tech | Purpose |
|---|---|
| React 19 | UI framework |
| Tailwind CSS | Styling |
| React Router DOM | Navigation |
| Axios | HTTP client |
| Razorpay Checkout | Payment UI |

### Backend
| Tech | Purpose |
|---|---|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Primary database |
| Redis (ioredis) | Rate limiting + caching |
| JWT | Authentication |
| Razorpay | Payment processing |
| Axios | Gateway request forwarding |

### Infrastructure
| Service | Purpose |
|---|---|
| MongoDB Atlas | Cloud database |
| Render | Backend hosting |
| Vercel | Frontend hosting |

---

## ✨ Core Features

### 🚪 API Gateway
The killer feature. Every request goes through your gateway first:
- Validates API key (Redis cached for speed)
- Applies per-key rate limiting (Redis counter)
- Logs every request to MongoDB
- Forwards to the real external API
- Returns response with rate limit headers

### 🔑 API Key Management
- Generate keys per API
- Revoke keys instantly (cache invalidated)
- Rotate keys (new key generated, old one stops working)
- Per-key rate limits set by owner

### 👥 Access Control
- Consumers browse available APIs
- Request access with optional reason
- Owner approves/rejects with custom rate limit
- Key auto-generated on approval

### 📊 Usage Tracking
- Every request logged with endpoint, method, status, latency
- Owner sees all consumer requests on their APIs
- Consumer sees only their own usage
- Stats update in real time

### 💰 Billing Engine
- Free tier: 1,000 requests/month
- Pay-as-you-go: ₹0.50 per 100 requests after free tier
- Bills calculated per API per month
- Invoices generated automatically
- Payment via Razorpay

### 🧪 API Playground
- Test APIs directly in the dashboard
- No Postman needed
- Select API → pick key → enter endpoint → see response
- Works for both owners and consumers

---

## 📁 Project Structure

```
apilio/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   ├── redis.js           # Redis connection
│   │   ├── razorpay.js        # Razorpay config
│   │   └── plans.js           # Subscription plans
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── apiController.js
│   │   ├── apiKeyController.js
│   │   ├── gatewayController.js
│   │   ├── billingController.js
│   │   ├── paymentController.js
│   │   ├── accessController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT verify + RBAC
│   │   └── gatewayMiddleware.js # Key validate + rate limit + log
│   ├── models/
│   │   ├── User.js
│   │   ├── Api.js
│   │   ├── ApiKey.js
│   │   ├── UsageLog.js
│   │   ├── Billing.js
│   │   ├── Payment.js
│   │   ├── Subscription.js
│   │   └── AccessRequest.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── apiRoutes.js
│   │   ├── apiKeyRoutes.js
│   │   ├── gatewayRoutes.js
│   │   ├── usageRoutes.js
│   │   ├── billingRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── accessRoutes.js
│   │   └── userRoutes.js
│   ├── services/
│   │   ├── billingService.js   # Billing calculation logic
│   │   └── rateLimitService.js # Redis rate limiting
│   ├── utils/
│   │   └── jwtHelper.js
│   ├── server.js
│   └── .env
│
└── frontend/
    └── src/
        ├── components/
        │   ├── common/
        │   │   ├── StatCard.jsx
        │   │   └── PageHeader.jsx
        │   └── layout/
        │       ├── Sidebar.jsx
        │       └── DashboardLayout.jsx
        ├── pages/
        │   ├── Landing.jsx
        │   ├── auth/
        │   │   ├── Login.jsx
        │   │   └── Register.jsx
        │   └── dashboard/
        │       ├── Dashboard.jsx
        │       ├── ApiList.jsx
        │       ├── ApiKeys.jsx
        │       ├── AllKeys.jsx
        │       ├── Logs.jsx
        │       ├── Billing.jsx
        │       ├── Subscription.jsx
        │       ├── Account.jsx
        │       ├── Playground.jsx
        │       ├── owner/
        │       │   ├── OwnerDashboard.jsx
        │       │   └── AccessRequests.jsx
        │       └── consumer/
        │           ├── ConsumerDashboard.jsx
        │           ├── BrowseApis.jsx
        │           └── MyAccess.jsx
        ├── services/
        │   └── api.js
        ├── store/
        │   └── authStore.js
        ├── App.jsx
        └── index.js
```

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional — graceful fallback if not available)

### 1. Clone repos
```bash
git clone https://github.com/YOUR_USERNAME/apilio-backend.git
git clone https://github.com/YOUR_USERNAME/apilio-frontend.git
```

### 2. Backend setup
```bash
cd apilio-backend
npm install
```

Create `.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/apilio
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your_secret
FRONTEND_URL=http://localhost:3000
```

```bash
npm run dev
# Server running on http://localhost:5000 ✅
```

### 3. Frontend setup
```bash
cd apilio-frontend
npm install
npm start
# Opens http://localhost:3000 ✅
```

---

## 🔌 API Endpoints

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
```

### APIs
```
GET    /api/apis
POST   /api/apis
GET    /api/apis/:id
PUT    /api/apis/:id
DELETE /api/apis/:id
POST   /api/apis/:id/keys
```

### Gateway
```
ALL    /gateway/:apiId/*
```

### Usage
```
GET    /api/usage
GET    /api/usage/stats
```

### Billing
```
GET    /api/billing
POST   /api/billing/calculate
GET    /api/billing/summary
POST   /api/billing/:id/pay
```

### Payments
```
GET    /api/payments/plans
GET    /api/payments/subscription
POST   /api/payments/create-order
POST   /api/payments/verify
GET    /api/payments/history
POST   /api/payments/create-order-for-bill
POST   /api/payments/verify-bill-payment
```

### Access Control
```
GET    /api/access/apis
POST   /api/access/request
GET    /api/access/my-access
GET    /api/access/my-requests
GET    /api/access/requests
POST   /api/access/approve/:id
POST   /api/access/reject/:id
GET    /api/access/consumer-usage
```

### User
```
GET    /api/user/profile
PUT    /api/user/profile
PUT    /api/user/password
DELETE /api/user/account
```

---

## 🧪 Testing the Gateway

```bash
# Make a request through the gateway
curl -X GET \
  https://apilio-backend.onrender.com/gateway/YOUR_API_ID/pokemon/pikachu \
  -H "x-api-key: mf_live_your_key_here"

# Response includes rate limit headers:
# X-RateLimit-Limit: 60
# X-RateLimit-Remaining: 59
# X-RateLimit-Reset: 45
# X-MeterFlow-Latency: 234ms
```

---

## 💳 Test Payments (Razorpay)

Use these test credentials in the Razorpay modal:

| Method | Details |
|---|---|
| UPI | `success@razorpay` |
| Card | `4111 1111 1111 1111` |
| Card Expiry | Any future date |
| CVV | Any 3 digits |
| OTP | `1234` |

---

## 🌍 Environment Variables

### Backend
| Variable | Description | Required |
|---|---|---|
| PORT | Server port | No (default 5000) |
| MONGO_URI | MongoDB connection string | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| JWT_REFRESH_SECRET | Refresh token secret | Yes |
| JWT_EXPIRE | Access token expiry | No (default 7d) |
| JWT_REFRESH_EXPIRE | Refresh token expiry | No (default 30d) |
| RAZORPAY_KEY_ID | Razorpay API key | Yes |
| RAZORPAY_KEY_SECRET | Razorpay secret | Yes |
| FRONTEND_URL | Frontend URL for CORS | Yes |
| REDIS_HOST | Redis host | No |
| REDIS_PORT | Redis port | No |

### Frontend
| Variable | Description |
|---|---|
| REACT_APP_API_URL | Backend API URL |
| REACT_APP_GATEWAY_URL | Gateway base URL |

---

## 🎯 How to Explain in Interviews

> "I built Apilio — a usage-based API billing platform with a custom API gateway that intercepts every request, validates API keys using Redis caching, applies per-key rate limiting, logs usage to MongoDB, and forwards to external APIs. The billing engine dynamically calculates costs based on monthly usage with a free tier and pay-as-you-go model — similar to how OpenAI and AWS charge for API usage. The platform supports two roles: API owners who publish and monetize APIs, and consumers who request access and pay based on usage."

---

## 📈 Key Technical Decisions

| Decision | Why |
|---|---|
| Redis for rate limiting | O(1) counter increment vs MongoDB query on every request |
| Redis key caching | Avoid MongoDB lookup on every gateway request |
| JWT refresh tokens | Short-lived access tokens + long-lived refresh for security |
| Role-based access | Separate experiences for owners and consumers |
| Axios in gateway | Simple HTTP forwarding with timeout support |
| MongoDB for logs | High write volume, flexible schema |

---

## 🔮 Future Improvements

- [ ] Webhook notifications when rate limit is hit
- [ ] API versioning support
- [ ] Team/organization accounts
- [ ] Custom domain support for gateway
- [ ] GraphQL API support
- [ ] Stripe integration (international payments)
- [ ] Email notifications for billing
- [ ] API documentation auto-generation

---

## 📄 License

MIT License — free to use for learning and portfolio purposes.

---

<div align="center">
  Built with ❤️ using Node.js, React, MongoDB, Redis and Razorpay
  <br/>
  <strong>Apilio</strong> — API Billing Made Simple
</div>