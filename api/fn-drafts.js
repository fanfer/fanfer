const jwt = require('jsonwebtoken');
const matter = require('gray-matter');
const pdf = require('pdf-parse');

const GITHUB_API = 'https://api.github.com';
const REPO = process.env.GITHUB_REPO || 'fanfer/fanfer';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || '';
const ghHeaders = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };

async function ghFetch(url, opts = {}) { const res = await fetch(url, { ...opts, headers: { ...ghHeaders, ...opts.headers } }); if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`); return res; }
async function getFile(path) { const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`); const data = await res.json(); return { content: Buffer.from(data.content, 'base64').toString('utf8'), sha: data.sha }; }
async function putFile(path, content, sha, message) { const body = { message: message || `admin: update ${path}`, content: Buffer.from(content, 'utf8').toString('base64'), branch: BRANCH }; if (sha) body.sha = sha; const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}`, { method: 'PUT', body: JSON.stringify(body) }); return res.json(); }
async function deleteFile(path, sha, message) { const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}`, { method: 'DELETE', body: JSON.stringify({ message: message || `admin: delete ${path}`, sha, branch: BRANCH }) }); return res.json(); }
async function listDir(dirPath) { const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(dirPath)}?ref=${BRANCH}`); return res.json(); }
function parseFrontmatter(content) { const r = matter(content); return { data: r.data, content: r.content }; }
function stringifyFrontmatter(data, content) { return matter.stringify(content || '', data); }
function verifyToken(req) { const h = req.headers.authorization; if (!h || !h.startsWith('Bearer ')) return null; try { return jwt.verify(h.slice(7), JWT_SECRET); } catch { return null; } }
function requireAuth(handler) { return async (req, res) => { const user = verifyToken(req); if (!user) return res.status(401).json({ error: 'Unauthorized' }); req.user = user; return handler(req, res); }; }
function sanitize(name) { return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, ''); }

function pdfTextToMarkdown(text, title) {
  const lines = text.split('\n');
  const result = [];
  let inCode = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines (paragraph break)
    if (!trimmed) {
      if (inCode) { result.push('```'); inCode = false; }
      result.push('');
      continue;
    }

    // Detect headings: short lines in Title Case or ALL CAPS, not ending with punctuation
    const isShort = trimmed.length < 80;
    const isTitleCase = /^[A-Z一-鿿]/.test(trimmed) && trimmed === trimmed.replace(/([a-z])([A-Z])/g, '$1 $2');
    const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
    const endsWithPunct = /[.,;:!?。，；：！？]$/.test(trimmed);
    const nextLineBlank = i + 1 < lines.length && !lines[i + 1].trim();

    if (isShort && (isAllCaps || (isTitleCase && nextLineBlank)) && !endsWithPunct && trimmed.length > 3) {
      if (inCode) { result.push('```'); inCode = false; }
      result.push(`## ${trimmed}`);
      result.push('');
      continue;
    }

    // Detect list items
    if (/^[•\-\*•‣◦]\s/.test(trimmed) || /^\d+[\.\)]\s/.test(trimmed)) {
      if (inCode) { result.push('```'); inCode = false; }
      const bullet = trimmed.replace(/^[•\-\*•‣◦]\s*/, '- ').replace(/^\d+[\.\)]\s*/, '- ');
      result.push(bullet);
      continue;
    }

    // Detect code-like content (indented, or contains programming keywords)
    const isIndented = line.startsWith('    ') || line.startsWith('\t');
    const hasCodePattern = /[{}\[\]();=]/.test(trimmed) && !/[，。！？]/.test(trimmed);
    if (isIndented && hasCodePattern && !inCode) {
      result.push('```');
      inCode = true;
    }

    result.push(trimmed);
  }

  if (inCode) result.push('```');

  const content = result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const date = new Date().toISOString().replace('T', ' ').slice(0, 19);

  return matter.stringify(content, {
    title,
    date,
    categories: [],
    tags: [],
  });
}

module.exports = requireAuth(async (req, res) => {
  try {
    const filename = req.query.filename;
    const action = req.query.action;

    // PDF upload
    if (action === 'pdf' && req.method === 'POST') {
      const { filename: pdfName, data: base64Data, title: customTitle } = req.body;
      if (!base64Data) return res.status(400).json({ error: 'No PDF data' });

      const pdfBuf = Buffer.from(base64Data.replace(/^data:application\/pdf;base64,/, ''), 'base64');
      const parsed = await pdf(pdfBuf, {
        pagerender: pageData => pageData.getTextContent().then(tc => {
          const lines = [];
          let lastY = null;
          for (const item of tc.items) {
            const y = Math.round(item.transform[5]);
            if (lastY !== null && Math.abs(y - lastY) > 2) lines.push('\n');
            lines.push(item.str);
            lastY = y;
          }
          return lines.join('');
        }),
      });

      const title = customTitle || parsed.info?.Title || (pdfName || 'untitled').replace(/\.pdf$/i, '');
      const markdown = pdfTextToMarkdown(parsed.text, title);

      let fname = sanitize(title), fpath = `source/_drafts/${fname}.md`, counter = 1;
      try { while (true) { await getFile(fpath); fpath = `source/_drafts/${fname}-${counter++}.md`; } } catch {}
      await putFile(fpath, markdown, null, `admin: import PDF "${title}"`);
      return res.status(201).json({ filename: fpath.split('/').pop().replace('.md', '') });
    }

    // Publish draft
    if (action === 'publish' && filename && req.method === 'POST') {
      const draftPath = `source/_drafts/${filename}.md`;
      const { content: raw, sha: draftSha } = await getFile(draftPath);
      const { data, content } = parseFrontmatter(raw);
      let postPath = `source/_posts/${filename}.md`, counter = 1;
      try { while (true) { await getFile(postPath); postPath = `source/_posts/${filename}-${counter++}.md`; } } catch {}
      await putFile(postPath, stringifyFrontmatter(data, content), null, `admin: publish draft "${data.title || filename}"`);
      await deleteFile(draftPath, draftSha, `admin: remove published draft "${filename}"`);
      return res.json({ filename: postPath.split('/').pop().replace('.md', '') });
    }

    // Detail operations
    if (filename) {
      if (req.method === 'GET') {
        const { content, sha } = await getFile(`source/_drafts/${filename}.md`);
        const { data, content: body } = parseFrontmatter(content);
        return res.json({ filename, frontmatter: data, content: body, sha });
      }
      if (req.method === 'PUT') {
        const { content, sha: _, ...frontmatter } = req.body;
        const { sha } = await getFile(`source/_drafts/${filename}.md`);
        await putFile(`source/_drafts/${filename}.md`, stringifyFrontmatter(frontmatter, content), sha, `admin: update draft "${frontmatter.title || filename}"`);
        return res.json({ success: true });
      }
      if (req.method === 'DELETE') {
        const { sha } = await getFile(`source/_drafts/${filename}.md`);
        await deleteFile(`source/_drafts/${filename}.md`, sha, `admin: delete draft "${filename}"`);
        return res.json({ success: true });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // List
    if (req.method === 'GET') {
      let entries;
      try { entries = await listDir('source/_drafts'); } catch { return res.json({ items: [], total: 0 }); }
      const mdFiles = entries.filter(e => e.name.endsWith('.md'));
      const drafts = await Promise.all(mdFiles.map(async f => { const { content } = await getFile(f.path); const { data } = parseFrontmatter(content); return { filename: f.name.replace(/\.md$/, ''), ...data }; }));
      return res.json({ items: drafts, total: drafts.length });
    }

    // Create
    if (req.method === 'POST') {
      const { content, ...frontmatter } = req.body;
      if (!frontmatter.title) return res.status(400).json({ error: 'Title required' });
      let fname = sanitize(frontmatter.title), fpath = `source/_drafts/${fname}.md`, counter = 1;
      try { while (true) { await getFile(fpath); fpath = `source/_drafts/${fname}-${counter++}.md`; } } catch {}
      await putFile(fpath, stringifyFrontmatter(frontmatter, content), null, `admin: create draft "${frontmatter.title}"`);
      return res.status(201).json({ filename: fpath.split('/').pop().replace('.md', '') });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message.includes('404')) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});
