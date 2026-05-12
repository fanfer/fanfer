const { requireAuth } = require('../../admin/lib/auth');
const { getFile, putFile, deleteFile } = require('../../admin/lib/github');
const { parseFrontmatter, stringifyFrontmatter } = require('../../admin/lib/yaml-utils');

module.exports = requireAuth(async (req, res) => {
  try {
    const { filename } = req.query;
    const path = `source/_posts/${filename}.md`;

    if (req.method === 'GET') {
      const { content, sha } = await getFile(path);
      const { data, content: body } = parseFrontmatter(content);
      return res.json({ filename, frontmatter: data, content: body, sha });
    }

    if (req.method === 'PUT') {
      const { content, sha: _ignore, ...frontmatter } = req.body;
      let fileSha;
      try {
        const existing = await getFile(path);
        fileSha = existing.sha;
      } catch {
        return res.status(404).json({ error: 'Post not found' });
      }
      const output = stringifyFrontmatter(frontmatter, content);
      await putFile(path, output, fileSha, `admin: update post "${frontmatter.title || filename}"`);
      return res.json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { sha } = await getFile(path);
      await deleteFile(path, sha, `admin: delete post "${filename}"`);
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'Post not found' });
    res.status(500).json({ error: err.message });
  }
});
