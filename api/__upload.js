const jwt = require('jsonwebtoken');

const GITHUB_API = 'https://api.github.com';
const REPO = process.env.GITHUB_REPO || 'fanfer/fanfer';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || '';
const ghHeaders = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };

async function ghFetch(url, opts = {}) { const res = await fetch(url, { ...opts, headers: { ...ghHeaders, ...opts.headers } }); if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`); return res; }
async function getFile(path) { const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`); const data = await res.json(); return { content: Buffer.from(data.content, 'base64').toString('utf8'), sha: data.sha }; }
async function putFile(path, content, sha, message, isBase64 = false) { const body = { message: message || `admin: update ${path}`, content: isBase64 ? content : Buffer.from(content, 'utf8').toString('base64'), branch: BRANCH }; if (sha) body.sha = sha; const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}`, { method: 'PUT', body: JSON.stringify(body) }); return res.json(); }
async function deleteFile(path, sha, message) { const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}`, { method: 'DELETE', body: JSON.stringify({ message: message || `admin: delete ${path}`, sha, branch: BRANCH }) }); return res.json(); }
async function listDir(dirPath) { const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(dirPath)}?ref=${BRANCH}`); return res.json(); }
function verifyToken(req) { const h = req.headers.authorization; if (!h || !h.startsWith('Bearer ')) return null; try { return jwt.verify(h.slice(7), JWT_SECRET); } catch { return null; } }
function requireAuth(handler) { return async (req, res) => { const user = verifyToken(req); if (!user) return res.status(401).json({ error: 'Unauthorized' }); req.user = user; return handler(req, res); }; }

module.exports = requireAuth(async (req, res) => {
  try {
    const filename = req.query.filename;

    // Delete
    if (filename && req.method === 'DELETE') {
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `source/assets/${safeName}`;
      const { sha } = await getFile(path);
      await deleteFile(path, sha, `admin: delete image ${safeName}`);
      return res.json({ success: true });
    }

    // List
    if (req.method === 'GET') {
      const entries = await listDir('source/assets');
      const files = entries.filter(e => e.type === 'file').map(e => ({ filename: e.name, url: `/assets/${e.name}`, size: e.size, sha: e.sha }));
      return res.json(files);
    }

    // Upload
    if (req.method === 'POST') {
      const { filename: fname, data } = req.body;
      if (!fname || !data) return res.status(400).json({ error: 'filename and data (base64) required' });
      const ext = fname.split('.').pop().toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return res.status(400).json({ error: 'Only image files allowed' });
      const safeName = fname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `source/assets/${safeName}`;
      let sha;
      try { ({ sha } = await getFile(path)); } catch {}
      const base64 = data.replace(/^data:[^;]+;base64,/, '');
      await putFile(path, base64, sha, `admin: upload image ${safeName}`, true);
      return res.json({ url: `/assets/${safeName}`, filename: safeName });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'File not found' });
    res.status(500).json({ error: err.message });
  }
});
