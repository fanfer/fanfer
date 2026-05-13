module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.replace(/^\/api\/posts\/?/, '').split('/').filter(Boolean);
  res.json({ ok: true, method: req.method, slug: parts, query: req.query });
};
