const { requireAuth } = require('../admin/lib/auth');
const { getFile, putFile, listDir } = require('../admin/lib/github');

module.exports = requireAuth(async (req, res) => {
  try {
    // GET /api/upload — list files
    if (req.method === 'GET') {
      const entries = await listDir('source/assets');
      const files = entries
        .filter(e => e.type === 'file')
        .map(e => ({
          filename: e.name,
          url: `/assets/${e.name}`,
          size: e.size,
          sha: e.sha,
        }));
      return res.json(files);
    }

    // POST /api/upload — upload file
    if (req.method === 'POST') {
      const { filename, data } = req.body;
      if (!filename || !data) return res.status(400).json({ error: 'filename and data (base64) required' });

      const ext = filename.split('.').pop().toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
        return res.status(400).json({ error: 'Only image files allowed' });
      }

      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `source/assets/${safeName}`;

      let sha;
      try { ({ sha } = await getFile(path)); } catch { /* new file */ }

      const base64 = data.replace(/^data:[^;]+;base64,/, '');
      await putFile(path, base64, sha, `admin: upload image ${safeName}`, true);

      return res.json({ url: `/assets/${safeName}`, filename: safeName });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
