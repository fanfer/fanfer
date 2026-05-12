const { requireAuth } = require('../../admin/lib/auth');
const { listDir, getFile } = require('../../admin/lib/github');
const { parseFrontmatter } = require('../../admin/lib/yaml-utils');

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    // Load posts
    const entries = await listDir('source/_posts');
    const mdFiles = entries.filter(e => e.name.endsWith('.md'));
    const posts = await Promise.all(mdFiles.map(async f => {
      const { content } = await getFile(f.path);
      const { data } = parseFrontmatter(content);
      return { filename: f.name.replace(/\.md$/, ''), ...data };
    }));
    posts.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // Load drafts
    let draftCount = 0;
    try {
      const draftEntries = await listDir('source/_drafts');
      draftCount = draftEntries.filter(e => e.name.endsWith('.md')).length;
    } catch {}

    // Aggregate categories and tags
    const categories = {};
    const tags = {};
    posts.forEach(p => {
      (Array.isArray(p.categories) ? p.categories : [p.categories].filter(Boolean)).forEach(c => { categories[c] = (categories[c] || 0) + 1; });
      (Array.isArray(p.tags) ? p.tags : [p.tags].filter(Boolean)).forEach(t => { tags[t] = (tags[t] || 0) + 1; });
    });

    res.json({
      postCount: posts.length,
      draftCount,
      categories: Object.entries(categories).map(([name, count]) => ({ name, count })),
      tags: Object.entries(tags).map(([name, count]) => ({ name, count })),
      recentPosts: posts.slice(0, 5).map(p => ({ filename: p.filename, title: p.title, date: p.date })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
