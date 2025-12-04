import config from './config';

/**
 * API client для работы с микросервисами через API Gateway
 */
export const microserviceClient = {
  baseUrl: config.apiBaseUrl,
  
  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('[API Request]', url, options.method || 'GET');
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };
    
    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('[API Error]', url, response.status, error);
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error('[API Exception]', url, error);
      throw error;
    }
  },
  
  // Convenience methods
  get: (endpoint: string, options?: RequestInit) => 
    microserviceClient.request(endpoint, { ...options, method: 'GET' }),
    
  post: (endpoint: string, data?: any, options?: RequestInit) =>
    microserviceClient.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  put: (endpoint: string, data?: any, options?: RequestInit) =>
    microserviceClient.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  patch: (endpoint: string, data?: any, options?: RequestInit) =>
    microserviceClient.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  delete: (endpoint: string, options?: RequestInit) =>
    microserviceClient.request(endpoint, { ...options, method: 'DELETE' }),
};

/**
 * Специализированные API клиенты для каждого микросервиса
 */

// Auth Service
export const authAPI = {
  login: (email: string, password: string) =>
    microserviceClient.post('/api/auth/login', { email, password }),
    
  register: (data: any) =>
    microserviceClient.post('/api/auth/register', data),
    
  logout: () =>
    microserviceClient.post('/api/auth/logout'),
    
  refresh: () =>
    microserviceClient.post('/api/auth/refresh'),
    
  verify: (token: string) =>
    microserviceClient.post('/api/auth/verify', { token }),
};

// Catalog Service (Products)
export const catalogAPI = {
  // Products
  getProducts: (params?: Record<string, any>) => {
    const queryString = new URLSearchParams(params).toString();
    return microserviceClient.get(`/api/products${queryString ? '?' + queryString : ''}`);
  },
  
  getProduct: (id: string) =>
    microserviceClient.get(`/api/products/${id}`),
    
  createProduct: (data: any) =>
    microserviceClient.post('/api/products', data),
    
  updateProduct: (id: string, data: any) =>
    microserviceClient.put(`/api/products/${id}`, data),
    
  deleteProduct: (id: string) =>
    microserviceClient.delete(`/api/products/${id}`),
  
  // Categories
  getCategories: () =>
    microserviceClient.get('/api/categories'),
    
  getCategory: (id: string) =>
    microserviceClient.get(`/api/categories/${id}`),
    
  createCategory: (data: any) =>
    microserviceClient.post('/api/categories', data),
    
  updateCategory: (id: string, data: any) =>
    microserviceClient.put(`/api/categories/${id}`, data),
    
  deleteCategory: (id: string) =>
    microserviceClient.delete(`/api/categories/${id}`),
  
  // Search
  search: (query: string, params?: Record<string, any>) => {
    const queryString = new URLSearchParams({ query, ...params }).toString();
    return microserviceClient.get(`/api/search?${queryString}`);
  },
};

// Order Service
export const orderAPI = {
  getOrders: (params?: Record<string, any>) => {
    const queryString = new URLSearchParams(params).toString();
    return microserviceClient.get(`/api/orders${queryString ? '?' + queryString : ''}`);
  },
  
  getOrder: (id: string) =>
    microserviceClient.get(`/api/orders/${id}`),
    
  createOrder: (data: any) =>
    microserviceClient.post('/api/orders', data),
    
  updateOrder: (id: string, data: any) =>
    microserviceClient.put(`/api/orders/${id}`, data),
    
  cancelOrder: (id: string) =>
    microserviceClient.post(`/api/orders/${id}/cancel`),
    
  getOrderStatus: (id: string) =>
    microserviceClient.get(`/api/orders/${id}/status`),
};

// Notification Service
export const notificationAPI = {
  getNotifications: (params?: Record<string, any>) => {
    const queryString = new URLSearchParams(params).toString();
    return microserviceClient.get(`/api/notifications${queryString ? '?' + queryString : ''}`);
  },
  
  getNotification: (id: string) =>
    microserviceClient.get(`/api/notifications/${id}`),
    
  sendNotification: (data: any) =>
    microserviceClient.post('/api/notifications', data),
    
  markAsRead: (id: string) =>
    microserviceClient.put(`/api/notifications/${id}/read`),
    
  deleteNotification: (id: string) =>
    microserviceClient.delete(`/api/notifications/${id}`),
};

// Wishlist Service
export const wishlistAPI = {
  getWishlist: () =>
    microserviceClient.get('/api/wishlist'),
    
  addToWishlist: (productId: string) =>
    microserviceClient.post('/api/wishlist', { productId }),
    
  removeFromWishlist: (productId: string) =>
    microserviceClient.delete(`/api/wishlist/${productId}`),
};

// Merchant Service
export const merchantAPI = {
  getMerchants: (params?: Record<string, any>) => {
    const queryString = new URLSearchParams(params).toString();
    return microserviceClient.get(`/api/merchants${queryString ? '?' + queryString : ''}`);
  },
  
  getMerchant: (id: string) =>
    microserviceClient.get(`/api/merchants/${id}`),
    
  createMerchant: (data: any) =>
    microserviceClient.post('/api/merchants', data),
    
  updateMerchant: (id: string, data: any) =>
    microserviceClient.put(`/api/merchants/${id}`, data),
    
  getMerchantStats: (id: string) =>
    microserviceClient.get(`/api/merchants/${id}/stats`),
};

export default microserviceClient;
