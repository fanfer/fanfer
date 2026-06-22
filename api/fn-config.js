const yaml = require('js-yaml');
const { requireAuth } = require('./_auth');
const { getFile, putFile, sendGitHubError } = require('./_github');

const VALID_CONFIG = ['link', 'creativity'];
const VALID_DATA = ['link', 'creativity'];

module.exports = requireAuth(async (req, res) => {
  try {
    const type = req.query.type;
    const resource = req.query.resource || 'config'; // 'config' or 'data'
    const VALID = resource === 'data' ? VALID_DATA : VALID_CONFIG;

    if (!type || !VALID.includes(type)) return res.status(400).json({ error: 'Invalid type' });

    const filePath = `source/_data/${type}.yml`;

    if (req.method === 'GET') {
      const { content } = await getFile(filePath);
      return res.json(yaml.load(content) || []);
    }

    if (req.method === 'PUT') {
      let sha;
      try { ({ sha } = await getFile(filePath)); } catch {}
      await putFile(filePath, yaml.dump(req.body, { indent: 2, lineWidth: -1, noRefs: true }), sha, `admin: update ${type}.yml`);
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (sendGitHubError(res, err)) return;
    res.status(500).json({ error: err.message });
  }
});
