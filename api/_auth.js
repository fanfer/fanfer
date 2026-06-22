const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '';

function isJwtConfigured() {
  return Boolean(JWT_SECRET);
}

function verifyToken(req) {
  if (!isJwtConfigured()) return null;
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), JWT_SECRET);
  } catch {
    return null;
  }
}

function signAdminToken(payload, options) {
  if (!isJwtConfigured()) {
    throw new Error('JWT_SECRET not configured');
  }
  return jwt.sign(payload, JWT_SECRET, options);
}

function requireAuth(handler) {
  return async (req, res) => {
    if (!isJwtConfigured()) {
      return res.status(500).json({ error: 'JWT_SECRET not configured' });
    }
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    return handler(req, res);
  };
}

module.exports = { isJwtConfigured, requireAuth, signAdminToken, verifyToken };
