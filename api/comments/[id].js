const { requireAuth } = require('../../admin/lib/auth');

const TWIKOO_URL = process.env.TWIKOO_API_URL || '';
const TWIKOO_PASSWORD = process.env.TWIKOO_ADMIN_PASSWORD || '';
let adminToken = null;

async function getTwikooToken() {
  if (adminToken) return adminToken;
  if (!TWIKOO_URL || !TWIKOO_PASSWORD) throw new Error('Twikoo not configured');
  const res = await fetch(TWIKOO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'GET_ADMIN_TOKEN', password: TWIKOO_PASSWORD }),
  });
  const data = await res.json();
  if (data?.result?.token) { adminToken = data.result.token; return adminToken; }
  throw new Error('Failed to get Twikoo token');
}

module.exports = requireAuth(async (req, res) => {
  const { id } = req.query;
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = await getTwikooToken();
    const r = await fetch(TWIKOO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'DELETE_COMMENT', id, token }),
    });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
