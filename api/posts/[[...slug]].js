const { requireAuth } = require('../../admin/lib/auth');
const { getFile, putFile, deleteFile } = require('../../admin/lib/github');
const { parseFrontmatter, stringifyFrontmatter } = require('../../admin/lib/yaml-utils');

module.exports = requireAuth(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.replace(/^\/api\/posts\/?/, '').split('/').filter(Boolean);
    const filename = parts[0] || null;

    if (!filename) return res.status(400).json({ error: 'filename required' });

    // GET /api/posts/:filename
    if (req.method === 'GET') {
      const { content, sha } = await getFile(`source/_posts/${filename}.md`);
      const { data, content: body } = parseFrontmatter(content);
      return res.json({ filename, frontmatter: data, content: body, sha });
    }

    // PUT /api/posts/:filename
    if (req.method === 'PUT') {
      const { content, sha: _, ...frontmatter } = req.body;
      const { sha } = await getFile(`source/_posts/${filename}.md`);
      await putFile(`source/_posts/${filename}.md`, stringifyFrontmatter(frontmatter, content), sha, `admin: update post "${frontmatter.title || filename}"`);
      return res.json({ success: true });
    }

    // DELETE /api/posts/:filename
    if (req.method === 'DELETE') {
      const { sha } = await getFile(`source/_posts/${filename}.md`);
      await deleteFile(`source/_posts/${filename}.md`, sha, `admin: delete post "${filename}"`);
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});
