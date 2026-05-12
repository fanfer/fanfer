const { requireAuth } = require('../../admin/lib/auth');
const { listDir, getFile } = require('../../admin/lib/github');
const { parseFrontmatter } = require('../../admin/lib/yaml-utils');

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const entries = await listDir('source');
    const pages = [];

    for (const entry of entries) {
      if (entry.type !== 'dir' || entry.name.startsWith('_')) continue;
      try {
        const { content } = await getFile(`source/${entry.name}/index.md`);
        const { data } = parseFrontmatter(content);
        pages.push({ slug: entry.name, frontmatter: data });
      } catch { /* no index.md, skip */ }
    }

    res.json({ items: pages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
