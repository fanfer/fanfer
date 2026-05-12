const { requireAuth } = require('../../admin/lib/auth');
const { getFile, putFile, deleteFile, listDir } = require('../../admin/lib/github');
const { parseFrontmatter, stringifyFrontmatter } = require('../../admin/lib/yaml-utils');

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ error: 'Filename required' });

    const draftPath = `source/_drafts/${filename}.md`;
    const { content: raw, sha: draftSha } = await getFile(draftPath);
    const { data, content } = parseFrontmatter(raw);

    // Find unique filename in posts
    let postPath = `source/_posts/${filename}.md`;
    let counter = 1;
    try { while (true) { await getFile(postPath); postPath = `source/_posts/${filename}-${counter++}.md`; } } catch {}

    const output = stringifyFrontmatter(data, content);
    await putFile(postPath, output, null, `admin: publish draft "${data.title || filename}"`);
    await deleteFile(draftPath, draftSha, `admin: remove published draft "${filename}"`);

    res.json({ filename: postPath.split('/').pop().replace('.md', '') });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'Draft not found' });
    res.status(500).json({ error: err.message });
  }
});
