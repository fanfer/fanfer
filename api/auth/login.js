const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ADMIN_USERNAME, ADMIN_PASSWORD_HASH, JWT_SECRET } = require('../../admin/lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username !== ADMIN_USERNAME) return res.status(401).json({ error: 'Invalid credentials' });
  if (!ADMIN_PASSWORD_HASH) return res.status(500).json({ error: 'ADMIN_PASSWORD_HASH not configured' });
  if (!bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username });
};
