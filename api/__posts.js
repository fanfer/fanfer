const jwt = require('jsonwebtoken');
const matter = require('gray-matter');

const GITHUB_API = 'https://api.github.com';
const REPO = process.env.GITHUB_REPO || 'fanfer/fanfer';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || '';

const ghHeaders = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };

async function ghFetch(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { ...ghHeaders, ...opts.headers } });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  return res;
}

async function getFile(path) {
  const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`);
  const data = await res.json();
  return { content: Buffer.from(data.content, 'base64').toString('utf8'), sha: data.sha };
}

async function putFile(path, content, sha, message, isBase64 = false) {
  const body = { message: message || `admin: update ${path}`, content: isBase64 ? content : Buffer.from(content, 'utf8').toString('base64'), branch: BRANCH };
  if (sha) body.sha = sha;
  const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}`, { method: 'PUT', body: JSON.stringify(body) });
  return res.json();
}

async function deleteFile(path, sha, message) {
  const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}`, { method: 'DELETE', body: JSON.stringify({ message: message || `admin: delete ${path}`, sha, branch: BRANCH }) });
  return res.json();
}

async function listDir(dirPath) {
  const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(dirPath)}?ref=${BRANCH}`);
  return res.json();
}

function parseFrontmatter(content) { const r = matter(content); return { data: r.data, content: r.content }; }
function stringifyFrontmatter(data, content) { return matter.stringify(content || '', data); }

function verifyToken(req) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), JWT_SECRET); } catch { return null; }
}

function requireAuth(handler) {
  return async (req, res) => {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    return handler(req, res);
  };
}

function sanitize(name) { return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, ''); }

module.exports = requireAuth(async (req, res) => {
  try {
    const filename = req.query.filename;

    // Detail operations (filename present)
    if (filename) {
      // GET /api/posts/:filename
      if (req.method === 'GET') {
        const { content, sha } = await getFile(`source/_posts/${filename}.md`);
        const { data, content: body } = parseFrontmatter(content);
        return res.json({ filename, frontmatter: data, content: body, sha });
      }
      // PUT /api/posts/:filename
      if (req.method === 'PUT') {
        const { content, sha: _, ...frontmatter } = req.body;
        const { sha } = await getFile(`source/_posts/${filename}.md`);
        await putFile(`source/_posts/${filename}.md`, stringifyFrontmatter(frontmatter, content), sha, `admin: update post "${frontmatter.title || filename}"`);
        return res.json({ success: true });
      }
      // DELETE /api/posts/:filename
      if (req.method === 'DELETE') {
        const { sha } = await getFile(`source/_posts/${filename}.md`);
        await deleteFile(`source/_posts/${filename}.md`, sha, `admin: delete post "${filename}"`);
        return res.json({ success: true });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // List operations (no filename)
    // GET /api/posts — list
    if (req.method === 'GET') {
      const entries = await listDir('source/_posts');
      const mdFiles = entries.filter(e => e.name.endsWith('.md'));
      const posts = await Promise.all(mdFiles.map(async f => {
        const { content } = await getFile(f.path);
        const { data } = parseFrontmatter(content);
        return { filename: f.name.replace(/\.md$/, ''), ...data };
      }));
      posts.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      const { search, category, tag, page = 1, limit = 20 } = req.query;
      let filtered = posts;
      if (search) { const q = search.toLowerCase(); filtered = filtered.filter(p => (p.title || '').toLowerCase().includes(q)); }
      if (category) { filtered = filtered.filter(p => (Array.isArray(p.categories) ? p.categories : [p.categories].filter(Boolean)).includes(category)); }
      if (tag) { filtered = filtered.filter(p => (Array.isArray(p.tags) ? p.tags : [p.tags].filter(Boolean)).includes(tag)); }
      const p = parseInt(page), l = parseInt(limit);
      return res.json({ items: filtered.slice((p - 1) * l, p * l), total: filtered.length, page: p, limit: l });
    }

    // POST /api/posts — create
    if (req.method === 'POST') {
      const { content, ...frontmatter } = req.body;
      if (!frontmatter.title) return res.status(400).json({ error: 'Title required' });
      if (!frontmatter.date) frontmatter.date = new Date().toISOString().replace('T', ' ').slice(0, 19);
      let fname = sanitize(frontmatter.title), fpath = `source/_posts/${fname}.md`, counter = 1;
      try { while (true) { await getFile(fpath); fpath = `source/_posts/${fname}-${counter++}.md`; } } catch {}
      await putFile(fpath, stringifyFrontmatter(frontmatter, content), null, `admin: create post "${frontmatter.title}"`);
      return res.status(201).json({ filename: fpath.split('/').pop().replace('.md', '') });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});
