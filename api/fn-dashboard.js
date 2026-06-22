const matter = require('gray-matter');
const { requireAuth } = require('./_auth');

const GITHUB_API = 'https://api.github.com';
const REPO = process.env.GITHUB_REPO || 'fanfer/fanfer';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;
const ghHeaders = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };

async function ghFetch(url, opts = {}) { const res = await fetch(url, { ...opts, headers: { ...ghHeaders, ...opts.headers } }); if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`); return res; }
async function listDir(dirPath) { const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(dirPath)}?ref=${BRANCH}`); return res.json(); }
async function getFile(path) { const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`); const data = await res.json(); return Buffer.from(data.content, 'base64').toString('utf8'); }

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function toCountList(map) {
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

async function readPostMeta(entry) {
  try {
    const content = await getFile(entry.path);
    const data = matter(content).data || {};
    return {
      filename: entry.name.replace(/\.md$/, ''),
      title: data.title || entry.name.replace(/\.md$/, ''),
      date: data.date || '',
      categories: asArray(data.categories),
      tags: asArray(data.tags),
    };
  } catch {
    return null;
  }
}

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const [posts, drafts, assets] = await Promise.all([listDir('source/_posts').catch(() => []), listDir('source/_drafts').catch(() => []), listDir('source/assets').catch(() => [])]);
    const postEntries = Array.isArray(posts) ? posts.filter(e => e.name.endsWith('.md')) : [];
    const postMetas = (await Promise.all(postEntries.map(readPostMeta)))
      .filter(Boolean)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const categoryCounts = {};
    const tagCounts = {};
    postMetas.forEach(post => {
      post.categories.forEach(category => { categoryCounts[category] = (categoryCounts[category] || 0) + 1; });
      post.tags.forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
    });

    const postCount = postEntries.length;
    const draftCount = Array.isArray(drafts) ? drafts.filter(e => e.name.endsWith('.md')).length : 0;
    const assetCount = Array.isArray(assets) ? assets.filter(e => e.type === 'file').length : 0;

    res.json({
      postCount,
      draftCount,
      assetCount,
      posts: postCount,
      drafts: draftCount,
      assets: assetCount,
      categories: toCountList(categoryCounts),
      tags: toCountList(tagCounts),
      recentPosts: postMetas.slice(0, 8),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
