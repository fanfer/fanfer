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

async function readSiteData(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'fanfer.top';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const res = await fetch(`${proto}://${host}/data.json`);
  if (!res.ok) throw new Error(`Failed to read site data: ${res.status}`);
  return res.json();
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
    const [siteData, drafts, assets, pages] = await Promise.all([
      readSiteData(req),
      listDir('source/_drafts').catch(() => []),
      listDir('source/assets'),
      listDir('source'),
    ]);
    const sitePosts = Array.isArray(siteData.posts) ? siteData.posts : [];
    const postMetas = sitePosts
      .map(post => ({
        filename: post.filename,
        title: post.title || post.filename,
        date: post.date || '',
        categories: asArray(post.categories),
        tags: asArray(post.tags),
      }))
      .filter(Boolean)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const categoryCounts = {};
    const tagCounts = {};
    postMetas.forEach(post => {
      post.categories.forEach(category => { categoryCounts[category] = (categoryCounts[category] || 0) + 1; });
      post.tags.forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
    });

    const postCount = postMetas.length;
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
