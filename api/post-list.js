module.exports = (req, res) => {
  res.json({ ok: true, handler: 'post-list', method: req.method });
};
