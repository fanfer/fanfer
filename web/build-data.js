import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import yaml from 'js-yaml'
import { Marked } from 'marked'
import hljs from 'highlight.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'source')
const DIST = path.join(__dirname, 'dist')

// --- Markdown renderer ---
const renderer = {
  code(code, lang) {
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
    const highlighted = hljs.highlight(code, { language }).value
    return `<div class="code-block"><div class="code-header"><span class="code-lang">${language}</span></div><pre><code class="hljs language-${language}">${highlighted}</code></pre></div>`
  },
  image(href, title, text) {
    return `<figure><img src="${href}" alt="${text}" loading="lazy">${title ? `<figcaption>${title}</figcaption>` : ''}</figure>`
  },
}

const marked = new Marked({
  breaks: true,
  gfm: true,
  renderer,
})

function calcReadTime(content) {
  const text = content.replace(/[#*`>\-\[\]()!]/g, '').replace(/\s+/g, '')
  const cjk = (text.match(/[一-鿿]/g) || []).length
  const words = text.replace(/[一-鿿]/g, '').length
  const mins = Math.ceil((cjk * 2 + words) / 400)
  return Math.max(1, mins)
}

function slugify(title) {
  return title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '')
}

// --- Read posts ---
console.log('Reading posts...')
const postsDir = path.join(SRC, '_posts')
const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'))

const posts = files.map(file => {
  const raw = fs.readFileSync(path.join(postsDir, file), 'utf8')
  const { data, content } = matter(raw)
  const html = marked.parse(content)
  const readTime = calcReadTime(content)
  const slug = slugify(data.title || file.replace(/\.md$/, ''))

  return {
    filename: file.replace(/\.md$/, ''),
    slug,
    title: data.title || 'Untitled',
    date: data.date || null,
    tags: Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []),
    categories: Array.isArray(data.categories) ? data.categories : (data.categories ? [data.categories] : []),
    description: data.description || '',
    cover: data.cover || '',
    top_img: data.top_img || '',
    readTime,
    content: html,
  }
}).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

// Add permalink (date-based URL) to each post
posts.forEach(p => {
  if (p.date) {
    const d = new Date(p.date)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    p.permalink = `/${y}/${m}/${day}/${p.slug}/`
  } else {
    p.permalink = `/post/${p.slug}/`
  }
})

console.log(`  ${posts.length} posts loaded`)

// --- Read data files ---
const linkData = yaml.load(fs.readFileSync(path.join(SRC, '_data', 'link.yml'), 'utf8'))
const creativityData = yaml.load(fs.readFileSync(path.join(SRC, '_data', 'creativity.yml'), 'utf8'))
const aboutRaw = fs.readFileSync(path.join(SRC, 'about', 'index.md'), 'utf8')
const aboutContent = marked.parse(matter(aboutRaw).content)

// --- Aggregate tags and categories ---
const tagMap = {}
const categoryMap = {}
posts.forEach(p => {
  p.tags.forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1 })
  p.categories.forEach(c => { categoryMap[c] = (categoryMap[c] || 0) + 1 })
})

// --- Write data.json ---
const dataOutput = {
  posts: posts.map(({ content, ...meta }) => meta),
  tags: tagMap,
  categories: categoryMap,
  links: linkData,
  creativity: creativityData,
  about: aboutContent,
}

fs.mkdirSync(DIST, { recursive: true })
fs.writeFileSync(path.join(DIST, 'data.json'), JSON.stringify(dataOutput, null, 2))

// Write individual post JSON files (for SSR)
fs.mkdirSync(path.join(DIST, 'posts'), { recursive: true })
posts.forEach(p => {
  fs.writeFileSync(path.join(DIST, 'posts', `${p.filename}.json`), JSON.stringify(p))
})

// --- Copy assets ---
const assetsSrc = path.join(SRC, 'assets')
const assetsDist = path.join(DIST, 'assets')
fs.mkdirSync(assetsDist, { recursive: true })
for (const file of fs.readdirSync(assetsSrc)) {
  if (file.startsWith('.')) continue
  fs.copyFileSync(path.join(assetsSrc, file), path.join(assetsDist, file))
}

// Copy favicon
const faviconSrc = path.join(SRC, 'assets', 'milk2.svg')
if (fs.existsSync(faviconSrc)) {
  fs.copyFileSync(faviconSrc, path.join(DIST, 'favicon.svg'))
}

// Copy admin frontend
const adminDist = path.join(ROOT, 'public', 'admin')
if (fs.existsSync(adminDist)) {
  const adminTarget = path.join(DIST, 'admin')
  fs.cpSync(adminDist, adminTarget, { recursive: true })
}

console.log('Build data complete')
