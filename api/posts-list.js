// post list handler
const { requireAuth } = require('../admin/lib/auth');
const { listDir, getFile, putFile } = require('../admin/lib/github');
const { parseFrontmatter, stringifyFrontmatter } = require('../admin/lib/yaml-utils');

function sanitize(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
}

module.exports = requireAuth(async (req, res) => {
  try {
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
      let fname = sanitize(frontmatter.title), path = `source/_posts/${fname}.md`, counter = 1;
      try { while (true) { await getFile(path); path = `source/_posts/${fname}-${counter++}.md`; } } catch {}
      await putFile(path, stringifyFrontmatter(frontmatter, content), null, `admin: create post "${frontmatter.title}"`);
      return res.status(201).json({ filename: path.split('/').pop().replace('.md', '') });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});
