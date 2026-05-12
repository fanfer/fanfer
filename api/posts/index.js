const { requireAuth } = require('../../admin/lib/auth');
const { listDir, getFile, putFile } = require('../../admin/lib/github');
const { parseFrontmatter, stringifyFrontmatter } = require('../../admin/lib/yaml-utils');

function sanitize(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
}

module.exports = requireAuth(async (req, res) => {
  try {
    if (req.method === 'GET') {
      const entries = await listDir('source/_posts');
      const mdFiles = entries.filter(e => e.name.endsWith('.md'));

      const posts = await Promise.all(mdFiles.map(async f => {
        const { content } = await getFile(f.path);
        const { data } = parseFrontmatter(content);
        return { filename: f.name.replace(/\.md$/, ''), ...data };
      }));

      posts.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      const { search, category, tag, page = 1, limit = 20 } = req.query || {};
      let filtered = posts;
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(p => (p.title || '').toLowerCase().includes(q));
      }
      if (category) {
        filtered = filtered.filter(p => {
          const cats = Array.isArray(p.categories) ? p.categories : [p.categories].filter(Boolean);
          return cats.includes(category);
        });
      }
      if (tag) {
        filtered = filtered.filter(p => {
          const t = Array.isArray(p.tags) ? p.tags : [p.tags].filter(Boolean);
          return t.includes(tag);
        });
      }

      const p = parseInt(page);
      const l = parseInt(limit);
      return res.json({ items: filtered.slice((p - 1) * l, p * l), total: filtered.length, page: p, limit: l });
    }

    if (req.method === 'POST') {
      const { content, ...frontmatter } = req.body;
      if (!frontmatter.title) return res.status(400).json({ error: 'Title required' });
      if (!frontmatter.date) frontmatter.date = new Date().toISOString().replace('T', ' ').slice(0, 19);

      let filename = sanitize(frontmatter.title);
      let path = `source/_posts/${filename}.md`;
      let counter = 1;
      try {
        while (true) { await getFile(path); path = `source/_posts/${filename}-${counter++}.md`; }
      } catch { /* file doesn't exist, good */ }

      const output = stringifyFrontmatter(frontmatter, content);
      await putFile(path, output, null, `admin: create post "${frontmatter.title}"`);
      return res.status(201).json({ filename: path.split('/').pop().replace('.md', '') });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
