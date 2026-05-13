const { requireAuth } = require('../../admin/lib/auth');
const { getFile, putFile } = require('../../admin/lib/github');
const { parseFrontmatter, stringifyFrontmatter } = require('../../admin/lib/yaml-utils');

module.exports = requireAuth(async (req, res) => {
  try {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: 'slug required' });

    // GET /api/pages/:slug
    if (req.method === 'GET') {
      const { content, sha } = await getFile(`source/${slug}/index.md`);
      const { data, content: body } = parseFrontmatter(content);
      return res.json({ slug, frontmatter: data, content: body, sha });
    }

    // PUT /api/pages/:slug
    if (req.method === 'PUT') {
      const { frontmatter, content } = req.body;
      const { sha } = await getFile(`source/${slug}/index.md`);
      await putFile(`source/${slug}/index.md`, stringifyFrontmatter(frontmatter, content), sha, `admin: update page "${slug}"`);
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});
