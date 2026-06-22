const { requireAuth } = require('./_auth');

const TWIKOO_URL = process.env.TWIKOO_API_URL || '';
const TWIKOO_PASSWORD = process.env.TWIKOO_ADMIN_PASSWORD || '';
let twikooToken = null;

async function getTwikooToken() {
  if (twikooToken) return twikooToken;
  if (!TWIKOO_URL || !TWIKOO_PASSWORD) throw new Error('Twikoo not configured');
  const res = await fetch(TWIKOO_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'GET_ADMIN_TOKEN', password: TWIKOO_PASSWORD }) });
  const data = await res.json();
  if (data?.result?.token) { twikooToken = data.result.token; return twikooToken; }
  throw new Error('Failed to get Twikoo token');
}

async function twikooCall(payload) {
  const token = await getTwikooToken();
  const res = await fetch(TWIKOO_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, token }) });
  return res.json();
}

module.exports = requireAuth(async (req, res) => {
  try {
    const id = req.query.id;

    if (id) {
      if (req.method === 'DELETE') {
        const data = await twikooCall({ event: 'DELETE_COMMENT', id });
        return res.json(data);
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (req.method === 'GET') {
      const { page = 1, limit = 20 } = req.query;
      const data = await twikooCall({ event: 'GET_COMMENT', url: '', page: parseInt(page), pageSize: parseInt(limit) });
      return res.json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
