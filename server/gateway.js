const express = require("express");
const cors = require("cors");
const httpProxy = require("express-http-proxy");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// Microservices URLs
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || "http://localhost:4001",
  catalog: process.env.CATALOG_SERVICE_URL || "http://localhost:4002",
  orders: process.env.ORDER_SERVICE_URL || "http://localhost:4003",
  notifications: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4004",
  merchant: process.env.MERCHANT_SERVICE_URL || "http://localhost:4005",
  wishlist: process.env.WISHLIST_SERVICE_URL || "http://localhost:4006",
  user: process.env.USER_SERVICE_URL || "http://localhost:4007",
  payment: process.env.PAYMENT_SERVICE_URL || "http://localhost:4008",
  shipping: process.env.SHIPPING_SERVICE_URL || "http://localhost:4009",
  review: process.env.REVIEW_SERVICE_URL || "http://localhost:4010",
  inventory: process.env.INVENTORY_SERVICE_URL || "http://localhost:4011",
  analytics: process.env.ANALYTICS_SERVICE_URL || "http://localhost:4012",
};

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.NEXTAUTH_URL,
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowed = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://85.234.106.106:3000",
      process.env.NEXTAUTH_URL,
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (allowed.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`Blocked CORS request from origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"), false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    gateway: "API Gateway",
    services: Object.keys(SERVICES),
  });
});

// Service health checks
app.get("/health/services", async (req, res) => {
  const healthChecks = {};

  for (const [service, url] of Object.entries(SERVICES)) {
    try {
      const response = await fetch(`${url}/health`, { timeout: 5000 });
      healthChecks[service] = {
        status: response.ok ? "UP" : "DOWN",
        url,
      };
    } catch (error) {
      healthChecks[service] = {
        status: "DOWN",
        url,
        error: error.message,
      };
    }
  }

  res.status(200).json(healthChecks);
});

// Routes for each microservice
// Auth Service (login, register, etc.)
app.use(
  "/api/auth",
  httpProxy(SERVICES.auth, {
    proxyReqPathResolver: (req) => `/auth${req.originalUrl.split("/api/auth")[1] || ""}`,
  })
);

// Catalog Service (products, categories, search)
app.use(
  "/api/products",
  httpProxy(SERVICES.catalog, {
    proxyReqPathResolver: (req) => `/products${req.originalUrl.split("/api/products")[1] || ""}`,
  })
);

app.use(
  "/api/categories",
  httpProxy(SERVICES.catalog, {
    proxyReqPathResolver: (req) => `/categories${req.originalUrl.split("/api/categories")[1] || ""}`,
  })
);

app.use(
  "/api/search",
  httpProxy(SERVICES.catalog, {
    proxyReqPathResolver: (req) => `/search${req.originalUrl.split("/api/search")[1] || ""}`,
  })
);

// Order Service
app.use(
  "/api/orders",
  httpProxy(SERVICES.orders, {
    proxyReqPathResolver: (req) => `/orders${req.originalUrl.split("/api/orders")[1] || ""}`,
  })
);

// Notification Service
app.use(
  "/api/notifications",
  httpProxy(SERVICES.notifications, {
    proxyReqPathResolver: (req) => `/notifications${req.originalUrl.split("/api/notifications")[1] || ""}`,
  })
);

// Merchant Service
app.use(
  "/api/merchants",
  httpProxy(SERVICES.merchant, {
    proxyReqPathResolver: (req) => `/merchants${req.originalUrl.split("/api/merchants")[1] || ""}`,
  })
);

// Wishlist Service
app.use(
  "/api/wishlist",
  httpProxy(SERVICES.wishlist, {
    proxyReqPathResolver: (req) => `/wishlist${req.originalUrl.split("/api/wishlist")[1] || ""}`,
  })
);

// User Service
app.use(
  "/api/users",
  httpProxy(SERVICES.user, {
    proxyReqPathResolver: (req) => `/users${req.originalUrl.split("/api/users")[1] || ""}`,
  })
);

// Payment Service
app.use(
  "/api/payments",
  httpProxy(SERVICES.payment, {
    proxyReqPathResolver: (req) => `/payments${req.originalUrl.split("/api/payments")[1] || ""}`,
  })
);

// Shipping Service
app.use(
  "/api/shipments",
  httpProxy(SERVICES.shipping, {
    proxyReqPathResolver: (req) => `/shipments${req.originalUrl.split("/api/shipments")[1] || ""}`,
  })
);

// Review Service
app.use(
  "/api/reviews",
  httpProxy(SERVICES.review, {
    proxyReqPathResolver: (req) => `/reviews${req.originalUrl.split("/api/reviews")[1] || ""}`,
  })
);

// Inventory Service
app.use(
  "/api/inventory",
  httpProxy(SERVICES.inventory, {
    proxyReqPathResolver: (req) => `/inventory${req.originalUrl.split("/api/inventory")[1] || ""}`,
  })
);

// Analytics Service
app.use(
  "/api/analytics",
  httpProxy(SERVICES.analytics, {
    proxyReqPathResolver: (req) => `/analytics${req.originalUrl.split("/api/analytics")[1] || ""}`,
  })
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    availablePaths: [
      "/api/auth",
      "/api/products",
      "/api/categories",
      "/api/search",
      "/api/orders",
      "/api/notifications",
      "/api/merchants",
      "/api/wishlist",
      "/api/users",
      "/api/payments",
      "/api/shipments",
      "/api/reviews",
      "/api/inventory",
      "/api/analytics",
    ],
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Gateway Error:", err);
  res.status(500).json({
    error: "Gateway Error",
    message: err.message,
  });
});

const PORT = process.env.GATEWAY_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log("Services:");
  Object.entries(SERVICES).forEach(([name, url]) => {
    console.log(`  - ${name}: ${url}`);
  });
});
