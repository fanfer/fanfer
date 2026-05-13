const { requireAuth } = require('../../admin/lib/auth');
const { getFile, deleteFile } = require('../../admin/lib/github');

module.exports = requireAuth(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.replace(/^\/api\/upload\/?/, '').split('/').filter(Boolean);
    const filename = parts[0] || null;

    if (!filename) return res.status(400).json({ error: 'filename required' });

    // DELETE /api/upload/:filename
    if (req.method === 'DELETE') {
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
