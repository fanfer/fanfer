const jwt = require('jsonwebtoken');
const yaml = require('js-yaml');

const GITHUB_API = 'https://api.github.com';
const REPO = process.env.GITHUB_REPO || 'fanfer/fanfer';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || '';
const ghHeaders = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };

async function ghFetch(url, opts = {}) { const res = await fetch(url, { ...opts, headers: { ...ghHeaders, ...opts.headers } }); if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`); return res; }
async function getFile(path) { const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`); const data = await res.json(); return { content: Buffer.from(data.content, 'base64').toString('utf8'), sha: data.sha }; }
async function putFile(path, content, sha, message) { const body = { message: message || `admin: update ${path}`, content: Buffer.from(content, 'utf8').toString('base64'), branch: BRANCH }; if (sha) body.sha = sha; const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}`, { method: 'PUT', body: JSON.stringify(body) }); return res.json(); }
function verifyToken(req) { const h = req.headers.authorization; if (!h || !h.startsWith('Bearer ')) return null; try { return jwt.verify(h.slice(7), JWT_SECRET); } catch { return null; } }
function requireAuth(handler) { return async (req, res) => { const user = verifyToken(req); if (!user) return res.status(401).json({ error: 'Unauthorized' }); req.user = user; return handler(req, res); }; }

const VALID_CONFIG = ['link', 'creativity'];
const VALID_DATA = ['link', 'creativity'];

module.exports = requireAuth(async (req, res) => {
  try {
    const type = req.query.type;
    const resource = req.query.resource || 'config'; // 'config' or 'data'
    const VALID = resource === 'data' ? VALID_DATA : VALID_CONFIG;

    if (!type || !VALID.includes(type)) return res.status(400).json({ error: 'Invalid type' });

    const filePath = `source/_data/${type}.yml`;

    if (req.method === 'GET') {
      const { content } = await getFile(filePath);
      return res.json(yaml.load(content) || []);
    }

    if (req.method === 'PUT') {
      let sha;
      try { ({ sha } = await getFile(filePath)); } catch {}
      await putFile(filePath, yaml.dump(req.body, { indent: 2, lineWidth: -1, noRefs: true }), sha, `admin: update ${type}.yml`);
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});
