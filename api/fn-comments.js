const { requireAuth } = require('./_auth');

const TWIKOO_URL = process.env.TWIKOO_API_URL || 'https://twikko.fanfer.top';
const TWIKOO_PASSWORD = process.env.TWIKOO_ADMIN_PASSWORD || '';
let twikooToken = null;

async function getTwikooToken() {
  if (twikooToken) return twikooToken;
  if (!TWIKOO_PASSWORD) throw new Error('Twikoo admin password not configured');
  const res = await fetch(TWIKOO_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'GET_ADMIN_TOKEN', password: TWIKOO_PASSWORD }) });
  const data = await res.json();
  if (data?.result?.token) { twikooToken = data.result.token; return twikooToken; }
  throw new Error(data?.message || 'Failed to get Twikoo token');
}

async function twikooCall(payload, options = {}) {
  const body = { ...payload };
  if (options.admin) body.token = await getTwikooToken();
  const res = await fetch(TWIKOO_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (data?.code && data.code !== 0) throw new Error(data.message || `Twikoo error ${data.code}`);
  return data;
}

function normalizePublicComments(data) {
  const items = data.data || [];
  return {
    result: {
      data: items,
      count: items.length,
      readonly: !TWIKOO_PASSWORD,
    },
  };
}

module.exports = requireAuth(async (req, res) => {
  try {
    const id = req.query.id;

    if (id) {
      if (req.method === 'DELETE') {
        if (!TWIKOO_PASSWORD) {
          return res.status(501).json({ error: 'TWIKOO_ADMIN_PASSWORD not configured; delete is disabled.' });
        }
        const data = await twikooCall({ event: 'COMMENT_DELETE_FOR_ADMIN', id }, { admin: true });
        return res.json(data);
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (req.method === 'GET') {
      const { page = 1, limit = 20 } = req.query;
      const pageNumber = parseInt(page);
      const pageSize = parseInt(limit);
      const data = TWIKOO_PASSWORD
        ? await twikooCall({ event: 'COMMENT_GET_FOR_ADMIN', page: pageNumber, pageSize }, { admin: true })
        : normalizePublicComments(await twikooCall({ event: 'GET_RECENT_COMMENTS', pageSize }));
      return res.json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
