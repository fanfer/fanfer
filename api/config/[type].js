const { requireAuth } = require('../../admin/lib/auth');
const { getFile, putFile } = require('../../admin/lib/github');
const { parseYaml, stringifyYaml } = require('../../admin/lib/yaml-utils');

module.exports = requireAuth(async (req, res) => {
  try {
    const { type } = req.query;
    const filename = type === 'butterfly' ? '_config.butterfly.yml' : '_config.yml';

    if (req.method === 'GET') {
      const { content } = await getFile(filename);
      return res.json(parseYaml(content));
    }

    if (req.method === 'PUT') {
      const { sha } = await getFile(filename);
      await putFile(filename, stringifyYaml(req.body), sha, `admin: update ${filename}`);
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
