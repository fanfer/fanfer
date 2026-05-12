const { requireAuth } = require('../../admin/lib/auth');
const { listDir, getFile, putFile, deleteFile } = require('../../admin/lib/github');
const { parseFrontmatter, stringifyFrontmatter } = require('../../admin/lib/yaml-utils');

function sanitize(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
}

module.exports = requireAuth(async (req, res) => {
  try {
    const slug = req.query.slug || [];
    const action = slug[0] || null;       // filename or 'publish'
    const filename = slug[1] || null;      // for publish: POST /api/drafts/publish, body has filename

    // GET /api/drafts — list
    if (req.method === 'GET' && !action) {
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

    // POST /api/drafts/publish
    if (req.method === 'POST' && action === 'publish') {
      const fname = req.body.filename;
      if (!fname) return res.status(400).json({ error: 'filename required in body' });
      const draftPath = `source/_drafts/${fname}.md`;
      const { content: raw, sha: draftSha } = await getFile(draftPath);
      const { data, content } = parseFrontmatter(raw);
      let postPath = `source/_posts/${fname}.md`, counter = 1;
      try { while (true) { await getFile(postPath); postPath = `source/_posts/${fname}-${counter++}.md`; } } catch {}
      await putFile(postPath, stringifyFrontmatter(data, content), null, `admin: publish draft "${data.title || fname}"`);
      await deleteFile(draftPath, draftSha, `admin: remove published draft "${fname}"`);
      return res.json({ filename: postPath.split('/').pop().replace('.md', '') });
    }

    // GET /api/drafts/:filename
    if (req.method === 'GET' && action) {
      const { content, sha } = await getFile(`source/_drafts/${action}.md`);
      const { data, content: body } = parseFrontmatter(content);
      return res.json({ filename: action, frontmatter: data, content: body, sha });
    }

    // POST /api/drafts — create
    if (req.method === 'POST' && !action) {
      const { content, ...frontmatter } = req.body;
      if (!frontmatter.title) return res.status(400).json({ error: 'Title required' });
      let fname = sanitize(frontmatter.title), path = `source/_drafts/${fname}.md`, counter = 1;
      try { while (true) { await getFile(path); path = `source/_drafts/${fname}-${counter++}.md`; } } catch {}
      await putFile(path, stringifyFrontmatter(frontmatter, content), null, `admin: create draft "${frontmatter.title}"`);
      return res.status(201).json({ filename: path.split('/').pop().replace('.md', '') });
    }

    // PUT /api/drafts/:filename
    if (req.method === 'PUT' && action) {
      const { content, sha: _, ...frontmatter } = req.body;
      const { sha } = await getFile(`source/_drafts/${action}.md`);
      await putFile(`source/_drafts/${action}.md`, stringifyFrontmatter(frontmatter, content), sha, `admin: update draft "${frontmatter.title || action}"`);
      return res.json({ success: true });
    }

    // DELETE /api/drafts/:filename
    if (req.method === 'DELETE' && action) {
      const { sha } = await getFile(`source/_drafts/${action}.md`);
      await deleteFile(`source/_drafts/${action}.md`, sha, `admin: delete draft "${action}"`);
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});
