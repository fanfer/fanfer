const { requireAuth } = require('../../admin/lib/auth');
const { listDir, getFile, putFile } = require('../../admin/lib/github');
const { parseFrontmatter, stringifyFrontmatter } = require('../../admin/lib/yaml-utils');

function sanitize(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
}

module.exports = requireAuth(async (req, res) => {
  try {
    if (req.method === 'GET') {
      let entries;
      try { entries = await listDir('source/_drafts'); } catch { return res.json({ items: [], total: 0 }); }
      const mdFiles = entries.filter(e => e.name.endsWith('.md'));
      const drafts = await Promise.all(mdFiles.map(async f => {
        const { content } = await getFile(f.path);
        const { data } = parseFrontmatter(content);
        return { filename: f.name.replace(/\.md$/, ''), ...data };
      }));
      return res.json({ items: drafts, total: drafts.length });
    }

    if (req.method === 'POST') {
      const { content, ...frontmatter } = req.body;
      if (!frontmatter.title) return res.status(400).json({ error: 'Title required' });

      let filename = sanitize(frontmatter.title);
      let path = `source/_drafts/${filename}.md`;
      let counter = 1;
      try { while (true) { await getFile(path); path = `source/_drafts/${filename}-${counter++}.md`; } } catch {}

      const output = stringifyFrontmatter(frontmatter, content);
      await putFile(path, output, null, `admin: create draft "${frontmatter.title}"`);
      return res.status(201).json({ filename: path.split('/').pop().replace('.md', '') });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
