const { requireAuth } = require('../admin/lib/auth');
const { getFile, putFile } = require('../admin/lib/github');

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
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

    // Strip data URL prefix if present: data:image/png;base64,...
    const base64 = data.replace(/^data:[^;]+;base64,/, '');
    await putFile(path, base64, sha, `admin: upload image ${safeName}`, true);

    res.json({ url: `/assets/${safeName}`, filename: safeName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
