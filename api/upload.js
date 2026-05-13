const { requireAuth } = require('../admin/lib/auth');
const { getFile, putFile, deleteFile, listDir } = require('../admin/lib/github');

module.exports = requireAuth(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.replace(/^\/api\/upload\/?/, '').split('/').filter(Boolean);
    const filename = parts[0] || null;

    // GET /api/upload — list files
    if (req.method === 'GET' && !filename) {
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
    if (req.method === 'POST' && !filename) {
      const { filename: fname, data } = req.body;
      if (!fname || !data) return res.status(400).json({ error: 'filename and data (base64) required' });

      const ext = fname.split('.').pop().toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
        return res.status(400).json({ error: 'Only image files allowed' });
      }

      const safeName = fname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `source/assets/${safeName}`;

      let sha;
      try { ({ sha } = await getFile(path)); } catch { /* new file */ }

      const base64 = data.replace(/^data:[^;]+;base64,/, '');
      await putFile(path, base64, sha, `admin: upload image ${safeName}`, true);

      return res.json({ url: `/assets/${safeName}`, filename: safeName });
    }

    // DELETE /api/upload/:filename
    if (req.method === 'DELETE' && filename) {
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `source/assets/${safeName}`;
      const { sha } = await getFile(path);
      await deleteFile(path, sha, `admin: delete image ${safeName}`);
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'File not found' });
    res.status(500).json({ error: err.message });
  }
});
