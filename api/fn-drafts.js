const jwt = require('jsonwebtoken');
const matter = require('gray-matter');
const pdf = require('pdf-parse');
const JSZip = require('jszip');

const GITHUB_API = 'https://api.github.com';
const REPO = process.env.GITHUB_REPO || 'fanfer/fanfer';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || '';
const ghHeaders = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };

async function ghFetch(url, opts = {}) { const res = await fetch(url, { ...opts, headers: { ...ghHeaders, ...opts.headers } }); if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`); return res; }
async function getFile(path) { const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`); const data = await res.json(); return { content: Buffer.from(data.content, 'base64').toString('utf8'), sha: data.sha }; }
async function putFile(path, content, sha, message, isBase64) { const body = { message: message || `admin: update ${path}`, content: isBase64 ? content : Buffer.from(content, 'utf8').toString('base64'), branch: BRANCH }; if (sha) body.sha = sha; const res = await ghFetch(`${GITHUB_API}/repos/${REPO}/contents/${encodeURIComponent(path)}`, { method: 'PUT', body: JSON.stringify(body) }); return res.json(); }
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

function findMainTex(zip) {
  // Find the .tex file with \documentclass
  for (const [path, entry] of Object.entries(zip.files)) {
    if (!path.endsWith('.tex') || entry.dir) continue;
    // Prioritize main.tex or paper.tex
    const name = path.split('/').pop().toLowerCase();
    if (['main.tex', 'paper.tex', 'manuscript.tex'].includes(name)) return path;
  }
  // Fallback: find any .tex with \documentclass
  for (const [path, entry] of Object.entries(zip.files)) {
    if (!path.endsWith('.tex') || entry.dir) continue;
    return path; // just pick first .tex
  }
  return null;
}

function latexToMarkdown(tex, imageMap) {
  let s = tex;

  // Remove preamble (everything before \begin{document})
  const docStart = s.indexOf('\\begin{document}');
  if (docStart !== -1) s = s.slice(docStart + '\\begin{document}'.length);
  const docEnd = s.indexOf('\\end{document}');
  if (docEnd !== -1) s = s.slice(0, docEnd);

  // Remove comments (lines starting with %, but not \%)
  s = s.split('\n').map(line => {
    let result = '';
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '%' && (i === 0 || line[i-1] !== '\\')) break;
      result += line[i];
    }
    return result;
  }).join('\n');

  // Extract title
  const titleMatch = s.match(/\\title\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/);
  const title = titleMatch ? titleMatch[1].replace(/\{|\}/g, '').trim() : '';

  // Extract abstract
  const abstractMatch = s.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
  const abstract = abstractMatch ? abstractMatch[1].trim() : '';

  // Remove LaTeX commands that don't convert well
  s = s.replace(/\\(?:maketitle|tableofcontents|newpage|clearpage|pagebreak|noindent|vspace|hspace|phantom|label|ref|eqref|pageref|cite|bibliography|bibliographystyle|usepackage|documentclass|author|date|thanks|footnote)\b[^;{]*(?:\{[^}]*\})?/g, '');
  s = s.replace(/\\(?:centering|raggedright|raggedleft)\b/g, '');

  // Convert sections
  s = s.replace(/\\section\*?\{([^}]*)\}/g, '\n## $1\n');
  s = s.replace(/\\subsection\*?\{([^}]*)\}/g, '\n### $1\n');
  s = s.replace(/\\subsubsection\*?\{([^}]*)\}/g, '\n#### $1\n');
  s = s.replace(/\\paragraph\{([^}]*)\}/g, '\n**$1** ');
  s = s.replace(/\\subparagraph\{([^}]*)\}/g, '\n**$1** ');

  // Convert display math environments to $$...$$
  s = s.replace(/\\begin\{(?:equation|equation\*|align|align\*|gather|gather\*|multline|multline\*|eqnarray|eqnarray\*)\}([\s\S]*?)\\end\{(?:equation|equation\*|align|align\*|gather|gather\*|multline|multline\*|eqnarray|eqnarray\*)\}/g, (_, math) => {
    return '\n$$\n' + math.trim() + '\n$$\n';
  });

  // Convert figures
  s = s.replace(/\\begin\{figure\}[\s\S]*?\\includegraphics(?:\[[^\]]*\])?\{([^}]*)\}[\s\S]*?(?:\\caption\{([^}]*)\})?[\s\S]*?\\end\{figure\}/g, (_, img, caption) => {
    const imgPath = imageMap[img] || img;
    return `\n![${caption || ''}](${imgPath})\n`;
  });
  // Also handle standalone \includegraphics
  s = s.replace(/\\includegraphics(?:\[[^\]]*\])?\{([^}]*)\}/g, (_, img) => {
    const imgPath = imageMap[img] || img;
    return `![](${imgPath})`;
  });

  // Convert tables (basic support)
  s = s.replace(/\\begin\{(?:tabular|tabularx)\}(?:\{[^}]*\})?([\s\S]*?)\\end\{(?:tabular|tabularx)\}/g, (_, tableContent) => {
    const rows = tableContent.split(/\\\\/).filter(r => r.trim());
    if (rows.length === 0) return '';
    const result = [];
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].split('&').map(c => c.replace(/\\[a-zA-Z]+/g, '').replace(/\{|\}/g, '').trim());
      if (cells.length > 1) {
        result.push('| ' + cells.join(' | ') + ' |');
        if (i === 0) result.push('| ' + cells.map(() => '---').join(' | ') + ' |');
      }
    }
    return '\n' + result.join('\n') + '\n';
  });

  // Convert code environments
  s = s.replace(/\\begin\{(?:verbatim|lstlisting|minted)\}([\s\S]*?)\\end\{(?:verbatim|lstlisting|minted)\}/g, (_, code) => {
    return '\n```\n' + code.trim() + '\n```\n';
  });

  // Convert lists
  s = s.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, items) => {
    return items.replace(/\\item\s*/g, '\n- ').trim();
  });
  s = s.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, items) => {
    let n = 0;
    return items.replace(/\\item\s*/g, () => `\n${++n}. `).trim();
  });

  // Convert inline formatting
  s = s.replace(/\\textbf\{([^}]*)\}/g, '**$1**');
  s = s.replace(/\\textit\{([^}]*)\}/g, '*$1*');
  s = s.replace(/\\emph\{([^}]*)\}/g, '*$1*');
  s = s.replace(/\\underline\{([^}]*)\}/g, '<u>$1</u>');
  s = s.replace(/\\texttt\{([^}]*)\}/g, '`$1`');
  s = s.replace(/\\text\{([^}]*)\}/g, '$1');
  s = s.replace(/\\textrm\{([^}]*)\}/g, '$1');
  s = s.replace(/\\textsc\{([^}]*)\}/g, '$1');

  // Convert links
  s = s.replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, '[$2]($1)');
  s = s.replace(/\\url\{([^}]*)\}/g, '[$1]($1)');

  // Convert line breaks
  s = s.replace(/\\\\(\s*\[[^\]]*\])?/g, '\n');
  s = s.replace(/\\newline\b/g, '\n');

  // Convert special characters
  s = s.replace(/\\&/g, '&');
  s = s.replace(/\\%/g, '%');
  s = s.replace(/\\#/g, '#');
  s = s.replace(/\\_/g, '_');
  s = s.replace(/\\\$/g, '$');
  s = s.replace(/~/g, ' ');
  s = s.replace(/\\ldots/g, '...');
  s = s.replace(/\\cdots/g, '⋯');
  s = s.replace(/\\cdot/g, '·');
  s = s.replace(/\\times/g, '×');
  s = s.replace(/\\pm/g, '±');
  s = s.replace(/\\leq/g, '≤');
  s = s.replace(/\\geq/g, '≥');
  s = s.replace(/\\neq/g, '≠');
  s = s.replace(/\\infty/g, '∞');
  s = s.replace(/\\alpha|\\beta|\\gamma|\\delta|\\epsilon|\\zeta|\\eta|\\theta|\\iota|\\kappa|\\lambda|\\mu|\\nu|\\xi|\\pi|\\rho|\\sigma|\\tau|\\upsilon|\\phi|\\chi|\\psi|\\omega/g, match => {
    const map = { '\\alpha':'α','\\beta':'β','\\gamma':'γ','\\delta':'δ','\\epsilon':'ε','\\zeta':'ζ','\\eta':'η','\\theta':'θ','\\iota':'ι','\\kappa':'κ','\\lambda':'λ','\\mu':'μ','\\ν':'ν','\\xi':'ξ','\\pi':'π','\\rho':'ρ','\\sigma':'σ','\\tau':'τ','\\upsilon':'υ','\\phi':'φ','\\chi':'χ','\\psi':'ψ','\\omega':'ω' };
    return map[match] || match;
  });

  // Remove remaining LaTeX commands (rough cleanup)
  s = s.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})?/g, '');

  // Clean up excessive whitespace
  s = s.replace(/\n{3,}/g, '\n\n').trim();

  // Build final markdown with frontmatter
  const date = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let content = '';
  if (abstract) content += `> ${abstract}\n\n`;
  content += s;

  return { title, markdown: matter.stringify(content, { title, date, categories: [], tags: [] }) };
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

    // LaTeX zip upload
    if (action === 'latex' && req.method === 'POST') {
      const { filename: zipName, data: base64Data, title: customTitle } = req.body;
      if (!base64Data) return res.status(400).json({ error: 'No zip data' });

      const zipBuf = Buffer.from(base64Data.replace(/^data:[^;]+;base64,/, ''), 'base64');
      const zip = await JSZip.loadAsync(zipBuf);

      // Find main .tex file
      const mainTexPath = findMainTex(zip);
      if (!mainTexPath) return res.status(400).json({ error: 'No .tex file found in zip' });

      const texContent = await zip.file(mainTexPath).async('string');

      // Extract and upload images
      const imageMap = {};
      const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf', '.eps'];
      const imageEntries = Object.entries(zip.files).filter(([path, entry]) =>
        !entry.dir && imageExts.some(ext => path.toLowerCase().endsWith(ext))
      );

      for (const [imgPath, entry] of imageEntries) {
        const imgData = await entry.async('base64');
        const imgName = imgPath.split('/').pop();
        const safeName = `latex-${Date.now()}-${imgName}`.replace(/[^a-zA-Z0-9._-]/g, '_');
        const assetPath = `source/assets/${safeName}`;

        try {
          const existing = await getFile(assetPath).catch(() => null);
          await putFile(assetPath, imgData, existing?.sha, `admin: upload LaTeX image "${imgName}"`, true);
        } catch {
          await putFile(assetPath, imgData, null, `admin: upload LaTeX image "${imgName}"`, true);
        }

        // Map both full path and filename-only references
        imageMap[imgPath] = `/assets/${safeName}`;
        imageMap[imgName] = `/assets/${safeName}`;
      }

      // Convert LaTeX to Markdown
      const { title: extractedTitle, markdown } = latexToMarkdown(texContent, imageMap);
      const title = customTitle || extractedTitle || (zipName || 'untitled').replace(/\.zip$/i, '');

      let fname = sanitize(title), fpath = `source/_drafts/${fname}.md`, counter = 1;
      try { while (true) { await getFile(fpath); fpath = `source/_drafts/${fname}-${counter++}.md`; } } catch {}
      await putFile(fpath, markdown, null, `admin: import LaTeX "${title}"`);
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
