const matter = require('gray-matter');
const { requireAuth } = require('./_auth');

const GITHUB_API = 'https://api.github.com';
const REPO = process.env.GITHUB_REPO || 'fanfer/fanfer';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;
const ghHeaders = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };

async function ghFetch(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { ...ghHeaders, ...opts.headers } });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  return res;
}
async function getFile(path) { const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`); const data = await res.json(); return { content: Buffer.from(data.content, 'base64').toString('utf8'), sha: data.sha }; }
async function putFile(path, content, sha, message) { const body = { message: message || `admin: update ${path}`, content: Buffer.from(content, 'utf8').toString('base64'), branch: BRANCH }; if (sha) body.sha = sha; const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}`, { method: 'PUT', body: JSON.stringify(body) }); return res.json(); }
async function listDir(dirPath) { const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(dirPath)}?ref=${BRANCH}`); return res.json(); }
function parseFrontmatter(content) { const r = matter(content); return { data: r.data, content: r.content }; }
function stringifyFrontmatter(data, content) { return matter.stringify(content || '', data); }

module.exports = requireAuth(async (req, res) => {
  try {
    const slug = req.query.slug;

    if (slug) {
      if (req.method === 'GET') {
        const { content, sha } = await getFile(`source/${slug}/index.md`);
        const { data, content: body } = parseFrontmatter(content);
        return res.json({ slug, frontmatter: data, content: body, sha });
      }
      if (req.method === 'PUT') {
        const { frontmatter, content } = req.body;
        const { sha } = await getFile(`source/${slug}/index.md`);
        await putFile(`source/${slug}/index.md`, stringifyFrontmatter(frontmatter, content), sha, `admin: update page "${slug}"`);
        return res.json({ success: true });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (req.method === 'GET') {
      const entries = await listDir('source');
      const pages = [];
      for (const entry of entries) {
        if (entry.type !== 'dir' || entry.name.startsWith('_')) continue;
        try { const { content } = await getFile(`source/${entry.name}/index.md`); const { data } = parseFrontmatter(content); pages.push({ slug: entry.name, frontmatter: data }); } catch {}
      }
      return res.json({ items: pages });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});
