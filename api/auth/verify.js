const { requireAuth } = require('../../admin/lib/auth');

module.exports = requireAuth(async (req, res) => {
  res.json({ valid: true, username: req.user.username });
});
