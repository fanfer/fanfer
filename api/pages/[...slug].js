const { requireAuth } = require('../../admin/lib/auth');
const { listDir, getFile, putFile } = require('../../admin/lib/github');
const { parseFrontmatter, stringifyFrontmatter } = require('../../admin/lib/yaml-utils');

module.exports = requireAuth(async (req, res) => {
  try {
    const slug = req.query.slug || [];
    const pageSlug = slug[0] || null;

    // GET /api/pages — list
    if (req.method === 'GET' && !pageSlug) {
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

    // GET /api/pages/:slug
    if (req.method === 'GET' && pageSlug) {
      const { content, sha } = await getFile(`source/${pageSlug}/index.md`);
      const { data, content: body } = parseFrontmatter(content);
      return res.json({ slug: pageSlug, frontmatter: data, content: body, sha });
    }

    // PUT /api/pages/:slug
    if (req.method === 'PUT' && pageSlug) {
      const { frontmatter, content } = req.body;
      const { sha } = await getFile(`source/${pageSlug}/index.md`);
      await putFile(`source/${pageSlug}/index.md`, stringifyFrontmatter(frontmatter, content), sha, `admin: update page "${pageSlug}"`);
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});
