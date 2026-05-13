const { requireAuth } = require('../../admin/lib/auth');
const { getFile, putFile, deleteFile } = require('../../admin/lib/github');
const { parseFrontmatter, stringifyFrontmatter } = require('../../admin/lib/yaml-utils');

module.exports = requireAuth(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.replace(/^\/api\/drafts\/?/, '').split('/').filter(Boolean);
    const filename = parts[0] || null;

    if (!filename) return res.status(400).json({ error: 'filename required' });

    // GET /api/drafts/:filename
    if (req.method === 'GET') {
      const { content, sha } = await getFile(`source/_drafts/${filename}.md`);
      const { data, content: body } = parseFrontmatter(content);
      return res.json({ filename, frontmatter: data, content: body, sha });
    }

    // PUT /api/drafts/:filename
    if (req.method === 'PUT') {
      const { content, sha: _, ...frontmatter } = req.body;
      const { sha } = await getFile(`source/_drafts/${filename}.md`);
      await putFile(`source/_drafts/${filename}.md`, stringifyFrontmatter(frontmatter, content), sha, `admin: update draft "${frontmatter.title || filename}"`);
      return res.json({ success: true });
    }

    // DELETE /api/drafts/:filename
    if (req.method === 'DELETE') {
      const { sha } = await getFile(`source/_drafts/${filename}.md`);
      await deleteFile(`source/_drafts/${filename}.md`, sha, `admin: delete draft "${filename}"`);
      return res.json({ success: true });
    }

    // POST /api/drafts/:filename — publish
    if (req.method === 'POST') {
      const draftPath = `source/_drafts/${filename}.md`;
      const { content: raw, sha: draftSha } = await getFile(draftPath);
      const { data, content } = parseFrontmatter(raw);
      let postPath = `source/_posts/${filename}.md`, counter = 1;
      try { while (true) { await getFile(postPath); postPath = `source/_posts/${filename}-${counter++}.md`; } } catch {}
      await putFile(postPath, stringifyFrontmatter(data, content), null, `admin: publish draft "${data.title || filename}"`);
      await deleteFile(draftPath, draftSha, `admin: remove published draft "${filename}"`);
      return res.json({ filename: postPath.split('/').pop().replace('.md', '') });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});
