const rateLimit = require('express-rate-limit');


const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 6, // 3 сброса пароля
  message: {
    error: 'Too many password reset attempts, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many password reset attempts, please try again later.',
      retryAfter: '1 hour'
    });
  }
});


const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // повышенный лимит для админов
  message: {
    error: 'Too many admin operations, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many admin operations, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

const wishlistLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 40,
  message: {
    error: 'Too many wishlist operations, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many wishlist operations, please try again later.',
      retryAfter: '5 minutes'
    });
  }
});

const productLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120,
  message: {
    error: 'Too many product requests, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many product requests, please try again later.',
      retryAfter: '1 minute'
    });
  }
});

const createDynamicLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: `${Math.ceil(windowMs / 60000)} minutes`
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: `${Math.ceil(windowMs / 60000)} minutes`
      });
    }
  });
};

module.exports = {
  passwordResetLimiter,
  adminLimiter,
  wishlistLimiter,
  productLimiter,
  createDynamicLimiter
};
