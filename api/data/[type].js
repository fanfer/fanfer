const { requireAuth } = require('../../admin/lib/auth');
const { getFile, putFile } = require('../../admin/lib/github');
const { parseYaml, stringifyYaml } = require('../../admin/lib/yaml-utils');

const VALID = ['link', 'creativity'];

module.exports = requireAuth(async (req, res) => {
  try {
    const { type } = req.query;
    if (!VALID.includes(type)) return res.status(400).json({ error: 'Invalid type' });

    const path = `source/_data/${type}.yml`;

    if (req.method === 'GET') {
      const { content } = await getFile(path);
      return res.json(parseYaml(content) || []);
    }

    if (req.method === 'PUT') {
      let sha;
      try { ({ sha } = await getFile(path)); } catch {}
      await putFile(path, stringifyYaml(req.body), sha, `admin: update ${type}.yml`);
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
