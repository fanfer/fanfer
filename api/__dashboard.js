const jwt = require('jsonwebtoken');

const GITHUB_API = 'https://api.github.com';
const REPO = process.env.GITHUB_REPO || 'fanfer/fanfer';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || '';
const ghHeaders = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };

async function ghFetch(url, opts = {}) { const res = await fetch(url, { ...opts, headers: { ...ghHeaders, ...opts.headers } }); if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`); return res; }
async function listDir(dirPath) { const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(dirPath)}?ref=${BRANCH}`); return res.json(); }
function verifyToken(req) { const h = req.headers.authorization; if (!h || !h.startsWith('Bearer ')) return null; try { return jwt.verify(h.slice(7), JWT_SECRET); } catch { return null; } }
function requireAuth(handler) { return async (req, res) => { const user = verifyToken(req); if (!user) return res.status(401).json({ error: 'Unauthorized' }); req.user = user; return handler(req, res); }; }

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const [posts, drafts, assets] = await Promise.all([listDir('source/_posts').catch(() => []), listDir('source/_drafts').catch(() => []), listDir('source/assets').catch(() => [])]);
    res.json({
      posts: Array.isArray(posts) ? posts.filter(e => e.name.endsWith('.md')).length : 0,
      drafts: Array.isArray(drafts) ? drafts.filter(e => e.name.endsWith('.md')).length : 0,
      assets: Array.isArray(assets) ? assets.filter(e => e.type === 'file').length : 0,
    });
  } catch { res.json({ posts: 0, drafts: 0, assets: 0 }); }
});
