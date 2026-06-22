const { requireAuth } = require('./_auth');
const { deleteFile, getFile, listDir, putFile, sendGitHubError } = require('./_github');

module.exports = requireAuth(async (req, res) => {
  try {
    const filename = req.query.filename;

    // Delete
    if (filename && req.method === 'DELETE') {
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `source/assets/${safeName}`;
      const { sha } = await getFile(path);
      await deleteFile(path, sha, `admin: delete image ${safeName}`);
      return res.json({ success: true });
    }

    // List
    if (req.method === 'GET') {
      const entries = await listDir('source/assets');
      const files = entries.filter(e => e.type === 'file').map(e => ({ filename: e.name, url: `/assets/${e.name}`, size: e.size, sha: e.sha }));
      return res.json(files);
    }

    // Upload
    if (req.method === 'POST') {
      const { filename: fname, data } = req.body;
      if (!fname || !data) return res.status(400).json({ error: 'filename and data (base64) required' });
      const ext = fname.split('.').pop().toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return res.status(400).json({ error: 'Only image files allowed' });
      const safeName = fname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `source/assets/${safeName}`;
      let sha;
      try { ({ sha } = await getFile(path)); } catch {}
      const base64 = data.replace(/^data:[^;]+;base64,/, '');
      await putFile(path, base64, sha, `admin: upload image ${safeName}`, true);
      return res.json({ url: `/assets/${safeName}`, filename: safeName });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (sendGitHubError(res, err, 'File not found')) return;
    res.status(500).json({ error: err.message });
  }
});
