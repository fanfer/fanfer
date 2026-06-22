const bcrypt = require('bcryptjs');
const { isJwtConfigured, signAdminToken, verifyToken } = require('./_auth');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

module.exports = async (req, res) => {
  const action = req.query.action;

  // POST /api/auth/login
  if (action === 'login') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (username !== ADMIN_USERNAME) return res.status(401).json({ error: 'Invalid credentials' });
    if (!ADMIN_PASSWORD_HASH) return res.status(500).json({ error: 'ADMIN_PASSWORD_HASH not configured' });
    if (!isJwtConfigured()) return res.status(500).json({ error: 'JWT_SECRET not configured' });
    if (!bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signAdminToken({ username, role: 'admin' }, { expiresIn: '24h' });
    return res.json({ token, username });
  }

  // POST /api/auth/verify
  if (action === 'verify') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({ valid: true, username: user.username });
  }

  res.status(400).json({ error: 'Invalid action' });
};
