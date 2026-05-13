const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const matter = require('gray-matter');
const yaml = require('js-yaml');

const GITHUB_API = 'https://api.github.com';
const REPO = process.env.GITHUB_REPO || 'fanfer/fanfer';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const JWT_SECRET = process.env.JWT_SECRET || '';
const TWIKOO_URL = process.env.TWIKOO_API_URL || '';
const TWIKOO_PASSWORD = process.env.TWIKOO_ADMIN_PASSWORD || '';

const ghHeaders = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
let twikooToken = null;

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

// --- Route handlers ---

const authLogin = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username !== ADMIN_USERNAME) return res.status(401).json({ error: 'Invalid credentials' });
  if (!ADMIN_PASSWORD_HASH) return res.status(500).json({ error: 'ADMIN_PASSWORD_HASH not configured' });
  if (!bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username });
};

const authVerify = requireAuth(async (req, res) => { res.json({ valid: true, username: req.user.username }); });

const postsList = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const entries = await listDir('source/_posts');
  const mdFiles = entries.filter(e => e.name.endsWith('.md'));
  const posts = await Promise.all(mdFiles.map(async f => { const { content } = await getFile(f.path); const { data } = parseFrontmatter(content); return { filename: f.name.replace(/\.md$/, ''), ...data }; }));
  posts.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const { search, category, tag, page = 1, limit = 20 } = req.query;
  let filtered = posts;
  if (search) { const q = search.toLowerCase(); filtered = filtered.filter(p => (p.title || '').toLowerCase().includes(q)); }
  if (category) { filtered = filtered.filter(p => (Array.isArray(p.categories) ? p.categories : [p.categories].filter(Boolean)).includes(category)); }
  if (tag) { filtered = filtered.filter(p => (Array.isArray(p.tags) ? p.tags : [p.tags].filter(Boolean)).includes(tag)); }
  const p = parseInt(page), l = parseInt(limit);
  res.json({ items: filtered.slice((p - 1) * l, p * l), total: filtered.length, page: p, limit: l });
});

const postsCreate = requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { content, ...frontmatter } = req.body;
  if (!frontmatter.title) return res.status(400).json({ error: 'Title required' });
  if (!frontmatter.date) frontmatter.date = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let fname = sanitize(frontmatter.title), fpath = `source/_posts/${fname}.md`, counter = 1;
  try { while (true) { await getFile(fpath); fpath = `source/_posts/${fname}-${counter++}.md`; } } catch {}
  await putFile(fpath, stringifyFrontmatter(frontmatter, content), null, `admin: create post "${frontmatter.title}"`);
  res.status(201).json({ filename: fpath.split('/').pop().replace('.md', '') });
});

const postGet = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { content, sha } = await getFile(`source/_posts/${req.params.filename}.md`);
  const { data, content: body } = parseFrontmatter(content);
  res.json({ filename: req.params.filename, frontmatter: data, content: body, sha });
});

const postUpdate = requireAuth(async (req, res) => {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  const { content, sha: _, ...frontmatter } = req.body;
  const { sha } = await getFile(`source/_posts/${req.params.filename}.md`);
  await putFile(`source/_posts/${req.params.filename}.md`, stringifyFrontmatter(frontmatter, content), sha, `admin: update post "${frontmatter.title || req.params.filename}"`);
  res.json({ success: true });
});

const postDelete = requireAuth(async (req, res) => {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  const { sha } = await getFile(`source/_posts/${req.params.filename}.md`);
  await deleteFile(`source/_posts/${req.params.filename}.md`, sha, `admin: delete post "${req.params.filename}"`);
  res.json({ success: true });
});

const pagesList = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const entries = await listDir('source');
  const pages = [];
  for (const entry of entries) {
    if (entry.type !== 'dir' || entry.name.startsWith('_')) continue;
    try { const { content } = await getFile(`source/${entry.name}/index.md`); const { data } = parseFrontmatter(content); pages.push({ slug: entry.name, frontmatter: data }); } catch {}
  }
  res.json({ items: pages });
});

const pageGet = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { content, sha } = await getFile(`source/${req.params.slug}/index.md`);
  const { data, content: body } = parseFrontmatter(content);
  res.json({ slug: req.params.slug, frontmatter: data, content: body, sha });
});

const pageUpdate = requireAuth(async (req, res) => {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  const { frontmatter, content } = req.body;
  const { sha } = await getFile(`source/${req.params.slug}/index.md`);
  await putFile(`source/${req.params.slug}/index.md`, stringifyFrontmatter(frontmatter, content), sha, `admin: update page "${req.params.slug}"`);
  res.json({ success: true });
});

const draftsList = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  let entries;
  try { entries = await listDir('source/_drafts'); } catch { return res.json({ items: [], total: 0 }); }
  const mdFiles = entries.filter(e => e.name.endsWith('.md'));
  const drafts = await Promise.all(mdFiles.map(async f => { const { content } = await getFile(f.path); const { data } = parseFrontmatter(content); return { filename: f.name.replace(/\.md$/, ''), ...data }; }));
  res.json({ items: drafts, total: drafts.length });
});

const draftsCreate = requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { content, ...frontmatter } = req.body;
  if (!frontmatter.title) return res.status(400).json({ error: 'Title required' });
  let fname = sanitize(frontmatter.title), fpath = `source/_drafts/${fname}.md`, counter = 1;
  try { while (true) { await getFile(fpath); fpath = `source/_drafts/${fname}-${counter++}.md`; } } catch {}
  await putFile(fpath, stringifyFrontmatter(frontmatter, content), null, `admin: create draft "${frontmatter.title}"`);
  res.status(201).json({ filename: fpath.split('/').pop().replace('.md', '') });
});

const draftGet = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { content, sha } = await getFile(`source/_drafts/${req.params.filename}.md`);
  const { data, content: body } = parseFrontmatter(content);
  res.json({ filename: req.params.filename, frontmatter: data, content: body, sha });
});

const draftUpdate = requireAuth(async (req, res) => {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  const { content, sha: _, ...frontmatter } = req.body;
  const { sha } = await getFile(`source/_drafts/${req.params.filename}.md`);
  await putFile(`source/_drafts/${req.params.filename}.md`, stringifyFrontmatter(frontmatter, content), sha, `admin: update draft "${frontmatter.title || req.params.filename}"`);
  res.json({ success: true });
});

const draftDelete = requireAuth(async (req, res) => {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  const { sha } = await getFile(`source/_drafts/${req.params.filename}.md`);
  await deleteFile(`source/_drafts/${req.params.filename}.md`, sha, `admin: delete draft "${req.params.filename}"`);
  res.json({ success: true });
});

const draftPublish = requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const fname = req.params.filename;
  const draftPath = `source/_drafts/${fname}.md`;
  const { content: raw, sha: draftSha } = await getFile(draftPath);
  const { data, content } = parseFrontmatter(raw);
  let postPath = `source/_posts/${fname}.md`, counter = 1;
  try { while (true) { await getFile(postPath); postPath = `source/_posts/${fname}-${counter++}.md`; } } catch {}
  await putFile(postPath, stringifyFrontmatter(data, content), null, `admin: publish draft "${data.title || fname}"`);
  await deleteFile(draftPath, draftSha, `admin: remove published draft "${fname}"`);
  res.json({ filename: postPath.split('/').pop().replace('.md', '') });
});

const commentsList = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { page = 1, limit = 20 } = req.query;
  const data = await twikooCall({ event: 'GET_COMMENT', url: '', page: parseInt(page), pageSize: parseInt(limit) });
  res.json(data);
});

const commentDelete = requireAuth(async (req, res) => {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  const data = await twikooCall({ event: 'DELETE_COMMENT', id: req.params.id });
  res.json(data);
});

const uploadList = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const entries = await listDir('source/assets');
  const files = entries.filter(e => e.type === 'file').map(e => ({ filename: e.name, url: `/assets/${e.name}`, size: e.size, sha: e.sha }));
  res.json(files);
});

const uploadCreate = requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { filename, data } = req.body;
  if (!filename || !data) return res.status(400).json({ error: 'filename and data (base64) required' });
  const ext = filename.split('.').pop().toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return res.status(400).json({ error: 'Only image files allowed' });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `source/assets/${safeName}`;
  let sha;
  try { ({ sha } = await getFile(path)); } catch {}
  const base64 = data.replace(/^data:[^;]+;base64,/, '');
  await putFile(path, base64, sha, `admin: upload image ${safeName}`, true);
  res.json({ url: `/assets/${safeName}`, filename: safeName });
});

const uploadDelete = requireAuth(async (req, res) => {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  const safeName = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `source/assets/${safeName}`;
  const { sha } = await getFile(path);
  await deleteFile(path, sha, `admin: delete image ${safeName}`);
  res.json({ success: true });
});

const dashboardStats = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const [posts, drafts, assets] = await Promise.all([listDir('source/_posts').catch(() => []), listDir('source/_drafts').catch(() => []), listDir('source/assets').catch(() => [])]);
    res.json({ posts: Array.isArray(posts) ? posts.filter(e => e.name.endsWith('.md')).length : 0, drafts: Array.isArray(drafts) ? drafts.filter(e => e.name.endsWith('.md')).length : 0, assets: Array.isArray(assets) ? assets.filter(e => e.type === 'file').length : 0 });
  } catch { res.json({ posts: 0, drafts: 0, assets: 0 }); }
});

const configGet = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const VALID = ['link', 'creativity'];
  if (!VALID.includes(req.params.type)) return res.status(400).json({ error: 'Invalid type' });
  const { content } = await getFile(`source/_data/${req.params.type}.yml`);
  res.json(yaml.load(content) || []);
});

const configUpdate = requireAuth(async (req, res) => {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  const VALID = ['link', 'creativity'];
  if (!VALID.includes(req.params.type)) return res.status(400).json({ error: 'Invalid type' });
  const path = `source/_data/${req.params.type}.yml`;
  let sha;
  try { ({ sha } = await getFile(path)); } catch {}
  await putFile(path, yaml.dump(req.body, { indent: 2, lineWidth: -1, noRefs: true }), sha, `admin: update ${req.params.type}.yml`);
  res.json({ success: true });
});

const dataGet = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const VALID = ['link', 'creativity'];
  if (!VALID.includes(req.params.type)) return res.status(400).json({ error: 'Invalid type' });
  const { content } = await getFile(`source/_data/${req.params.type}.yml`);
  res.json(yaml.load(content) || []);
});

const dataUpdate = requireAuth(async (req, res) => {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  const VALID = ['link', 'creativity'];
  if (!VALID.includes(req.params.type)) return res.status(400).json({ error: 'Invalid type' });
  const path = `source/_data/${req.params.type}.yml`;
  let sha;
  try { ({ sha } = await getFile(path)); } catch {}
  await putFile(path, yaml.dump(req.body, { indent: 2, lineWidth: -1, noRefs: true }), sha, `admin: update ${req.params.type}.yml`);
  res.json({ success: true });
});

// --- Router ---
const routes = [
  { pattern: /^auth\/login$/, handler: authLogin },
  { pattern: /^auth\/verify$/, handler: authVerify },
  { pattern: /^posts$/, GET: postsList, POST: postsCreate },
  { pattern: /^posts\/([^/]+)$/, params: ['filename'], GET: postGet, PUT: postUpdate, DELETE: postDelete },
  { pattern: /^pages$/, GET: pagesList },
  { pattern: /^pages\/([^/]+)$/, params: ['slug'], GET: pageGet, PUT: pageUpdate },
  { pattern: /^drafts$/, GET: draftsList, POST: draftsCreate },
  { pattern: /^drafts\/([^/]+)\/publish$/, params: ['filename'], POST: draftPublish },
  { pattern: /^drafts\/([^/]+)$/, params: ['filename'], GET: draftGet, PUT: draftUpdate, DELETE: draftDelete },
  { pattern: /^comments$/, GET: commentsList },
  { pattern: /^comments\/([^/]+)$/, params: ['id'], DELETE: commentDelete },
  { pattern: /^upload$/, GET: uploadList, POST: uploadCreate },
  { pattern: /^upload\/([^/]+)$/, params: ['filename'], DELETE: uploadDelete },
  { pattern: /^dashboard\/stats$/, GET: dashboardStats },
  { pattern: /^config\/([^/]+)$/, params: ['type'], GET: configGet, PUT: configUpdate },
  { pattern: /^data\/([^/]+)$/, params: ['type'], GET: dataGet, PUT: dataUpdate },
];

module.exports = async (req, res) => {
  try {
    // Debug: return the raw req.url to understand Vercel's behavior
    if (req.query && req.query._debug) {
      return res.json({ url: req.url, method: req.method, query: req.query, headers: { host: req.headers.host } });
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname.replace(/^\/api\/?/, '');

    for (const route of routes) {
      const match = path.match(route.pattern);
      if (!match) continue;

      req.params = {};
      if (route.params) {
        route.params.forEach((name, i) => { req.params[name] = match[i + 1]; });
      }

      if (route.handler) return route.handler(req, res);
      const methodHandler = route[req.method];
      if (methodHandler) return methodHandler(req, res);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    res.status(404).json({ error: 'Not found' });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
};
