const { requireAuth } = require('./_auth');

const TWIKOO_URL = process.env.TWIKOO_API_URL || 'https://twikko.fanfer.top';
const TWIKOO_PASSWORD = process.env.TWIKOO_ADMIN_PASSWORD || '';
let twikooToken = null;

function twikooError(message, code) {
  const err = new Error(message);
  err.twikooCode = code;
  return err;
}

async function requestTwikoo(body) {
  const res = await fetch(TWIKOO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Twikoo returned non-JSON response: ${text.slice(0, 120)}`);
  }

  if (!res.ok) {
    throw twikooError(data?.message || `Twikoo HTTP ${res.status}`, data?.code);
  }

  if (data?.code && data.code !== 0) {
    throw twikooError(data.message || `Twikoo error ${data.code}`, data.code);
  }

  return data;
}

async function getTwikooToken(force = false) {
  if (twikooToken && !force) return twikooToken;
  if (!TWIKOO_PASSWORD) throw new Error('Twikoo admin password not configured');
  const data = await requestTwikoo({ event: 'GET_ADMIN_TOKEN', password: TWIKOO_PASSWORD });
  const token = data?.result?.token || data?.data?.token || data?.token;
  if (token) {
    twikooToken = token;
    return twikooToken;
  }
  throw new Error(data?.message || 'Failed to get Twikoo token');
}

async function twikooCall(payload, options = {}) {
  const body = { ...payload };
  if (options.admin) body.token = await getTwikooToken(Boolean(options.refreshToken));
  try {
    return await requestTwikoo(body);
  } catch (err) {
    if (options.admin && err.twikooCode === 1024 && !options.refreshToken) {
      twikooToken = null;
      return twikooCall(payload, { ...options, refreshToken: true });
    }
    throw err;
  }
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

function normalizeAdminComments(data) {
  const result = data.result || data;
  const items = result.data || result.comments || data.data || [];
  const count = result.count ?? result.total ?? result.totalCount ?? items.length;
  return {
    result: {
      data: items,
      count,
      readonly: false,
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
      const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
      const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
      const data = TWIKOO_PASSWORD
        ? normalizeAdminComments(await twikooCall({ event: 'COMMENT_GET_FOR_ADMIN', page: pageNumber, pageSize }, { admin: true }))
        : normalizePublicComments(await twikooCall({ event: 'GET_RECENT_COMMENTS', pageSize }));
      return res.json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
