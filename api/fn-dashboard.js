const matter = require('gray-matter');
const { requireAuth } = require('./_auth');
const { getFile, listDir, sendGitHubError } = require('./_github');

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function toCountList(map) {
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

async function readPostMeta(entry) {
  try {
    const { content } = await getFile(entry.path);
    const data = matter(content).data || {};
    return {
      filename: entry.name.replace(/\.md$/, ''),
      title: data.title || entry.name.replace(/\.md$/, ''),
      date: data.date || '',
      categories: asArray(data.categories),
      tags: asArray(data.tags),
    };
  } catch {
    return null;
  }
}

async function readPageSlug(entry) {
  try {
    await getFile(`source/${entry.name}/index.md`);
    return entry.name;
  } catch {
    return null;
  }
}

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const [posts, drafts, assets, pages] = await Promise.all([
      listDir('source/_posts'),
      listDir('source/_drafts').catch(() => []),
      listDir('source/assets'),
      listDir('source'),
    ]);
    const postEntries = Array.isArray(posts) ? posts.filter(e => e.name.endsWith('.md')) : [];
    const postMetas = (await Promise.all(postEntries.map(readPostMeta)))
      .filter(Boolean)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const categoryCounts = {};
    const tagCounts = {};
    postMetas.forEach(post => {
      post.categories.forEach(category => { categoryCounts[category] = (categoryCounts[category] || 0) + 1; });
      post.tags.forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
    });

    const postCount = postEntries.length;
    const draftCount = Array.isArray(drafts) ? drafts.filter(e => e.name.endsWith('.md')).length : 0;
    const assetCount = Array.isArray(assets) ? assets.filter(e => e.type === 'file').length : 0;
    const pageDirs = Array.isArray(pages) ? pages.filter(e => e.type === 'dir' && !e.name.startsWith('_')) : [];
    const pageCount = (await Promise.all(pageDirs.map(readPageSlug))).filter(Boolean).length;

    res.json({
      postCount,
      draftCount,
      assetCount,
      pageCount,
      posts: postCount,
      drafts: draftCount,
      assets: assetCount,
      pages: pageCount,
      categories: toCountList(categoryCounts),
      tags: toCountList(tagCounts),
      recentPosts: postMetas.slice(0, 8),
    });
  } catch (err) {
    if (sendGitHubError(res, err)) return;
    res.status(500).json({ error: err.message });
  }
});
