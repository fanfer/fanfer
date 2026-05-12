import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')

// Load the SSR bundle built by Vite
const { createApp } = await import('./dist-ssr/main-ssr.js')
const { renderToString } = await import('@vue/server-renderer')

const data = JSON.parse(fs.readFileSync(path.join(DIST, 'data.json'), 'utf8'))
const template = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8')

async function render(routePath, ssrData = {}) {
  const { app, router } = createApp()
  await router.push(routePath)
  await router.isReady()

  app.config.globalProperties.$ssrData = ssrData

  const html = await renderToString(app)
  const fullHtml = template
    .replace('<div id="app"></div>', `<div id="app">${html}</div>`)
    .replace('</head>', `<script>window.__SSR_DATA__=${JSON.stringify(ssrData).replace(/</g, '\\u003c')}</script></head>`)

  let outPath
  if (routePath === '/') {
    outPath = path.join(DIST, 'index.html')
  } else {
    const cleanPath = routePath.replace(/^\//, '').replace(/\/$/, '')
    outPath = path.join(DIST, cleanPath, 'index.html')
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, fullHtml)
}

// Render all pages
await render('/', { posts: data.posts.slice(0, 10), page: 1, total: data.posts.length })
console.log('  /')

await render('/archives/', { posts: data.posts })
console.log('  /archives/')

await render('/tags/', { tags: data.tags })
console.log('  /tags/')

await render('/categories/', { categories: data.categories })
console.log('  /categories/')

await render('/link/', { links: data.links })
console.log('  /link/')

await render('/about/', { content: data.about })
console.log('  /about/')

// Render each post
const postsWithContent = data.posts.map(meta => {
  try {
    const full = JSON.parse(fs.readFileSync(path.join(DIST, 'posts', `${meta.filename}.json`), 'utf8'))
    return full
  } catch {
    return meta
  }
})

for (const p of postsWithContent) {
  await render(p.permalink, { post: p })
  console.log(`  ${p.permalink}`)
}

// 404 page
const { app: app404, router: router404 } = createApp()
await router404.push('/404.html')
await router404.isReady()
const html404 = await renderToString(app404)
const full404 = template
  .replace('<div id="app"></div>', `<div id="app">${html404}</div>`)
  .replace('<title>fanfer</title>', '<title>404 - fanfer</title>')
fs.writeFileSync(path.join(DIST, '404.html'), full404)
console.log('  /404.html')

// SPA fallback
const spaHtml = template.replace('<div id="app"></div>', '<div id="app"></div>')
fs.writeFileSync(path.join(DIST, '200.html'), spaHtml)

console.log('SSG build complete!')
