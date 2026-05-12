const jwt = require('jsonwebtoken');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const JWT_SECRET = process.env.JWT_SECRET || '';

function verifyToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(handler) {
  return async (req, res) => {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    return handler(req, res);
  };
}

module.exports = { verifyToken, requireAuth, ADMIN_USERNAME, ADMIN_PASSWORD_HASH, JWT_SECRET };
