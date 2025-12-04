const config = {
  // Main API Gateway
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  
  // Microservices endpoints (optional direct access)
  services: {
    auth: process.env.NEXT_PUBLIC_AUTH_SERVICE || 'http://localhost:4001',
    catalog: process.env.NEXT_PUBLIC_CATALOG_SERVICE || 'http://localhost:4002',
    orders: process.env.NEXT_PUBLIC_ORDER_SERVICE || 'http://localhost:4003',
    notifications: process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE || 'http://localhost:4004',
    merchant: process.env.NEXT_PUBLIC_MERCHANT_SERVICE || 'http://localhost:4005',
    wishlist: process.env.NEXT_PUBLIC_WISHLIST_SERVICE || 'http://localhost:4006',
  },
  
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
};

export default config;


