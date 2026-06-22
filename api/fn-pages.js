const matter = require('gray-matter');
const { requireAuth } = require('./_auth');
const { getFile, listDir, putFile, sendGitHubError } = require('./_github');
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
      pages.sort((a, b) => a.slug.localeCompare(b.slug));
      return res.json({ items: pages, total: pages.length });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (sendGitHubError(res, err)) return;
    res.status(500).json({ error: err.message });
  }
});
