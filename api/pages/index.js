const { requireAuth } = require('../../admin/lib/auth');
const { listDir, getFile } = require('../../admin/lib/github');
const { parseFrontmatter } = require('../../admin/lib/yaml-utils');

module.exports = requireAuth(async (req, res) => {
  try {
    // GET /api/pages — list
    if (req.method === 'GET') {
      const entries = await listDir('source');
      const pages = [];
      for (const entry of entries) {
        if (entry.type !== 'dir' || entry.name.startsWith('_')) continue;
        try {
          const { content } = await getFile(`source/${entry.name}/index.md`);
          const { data } = parseFrontmatter(content);
          pages.push({ slug: entry.name, frontmatter: data });
        } catch {}
      }
      return res.json({ items: pages });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});
