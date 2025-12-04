const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token from Authorization header.
 * Sets `req.user = { id, role }` when token is valid.
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not set in environment');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const payload = jwt.verify(token, secret);
    // Expected payload has { id, role, iat, exp }
    req.user = {
      id: payload.id || payload.userId || payload.sub,
      role: payload.role || payload.roles || null,
    };
    return next();
  } catch (err) {
    console.warn('JWT verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authenticateJWT;
