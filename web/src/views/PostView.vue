<script setup>
import { ref, onMounted, inject, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import PostMeta from '../components/PostMeta.vue'
import ReadingProgress from '../components/ReadingProgress.vue'
import site from '../data/site.js'
import { assetUrl } from '../utils/assets.js'

const route = useRoute()
const post = ref(null)
const commentsStatus = ref('idle')
const commentsMessage = ref('')
const activeCommentPath = ref('')

const TWIKOO_CDN_SOURCES = [
  'https://cdn.jsdelivr.net/npm/twikoo@1.7.13/dist/twikoo.min.js',
  'https://s4.zstatic.net/npm/twikoo@1.7.13/dist/twikoo.min.js',
  'https://registry.npmmirror.com/twikoo/1.7.13/files/dist/twikoo.min.js',
]

let twikooScriptPromise = null
let postsPromise = null

const ssrData = inject('__ssrData', null)
if (ssrData?.post && isCurrentPost(ssrData.post)) {
  post.value = ssrData.post
}

onMounted(resolvePost)

watch(() => route.fullPath, async () => {
  await resolvePost()
})

async function resolvePost() {
  if (!post.value || !isCurrentPost(post.value)) {
    if (window.__SSR_DATA__?.post && isCurrentPost(window.__SSR_DATA__.post)) {
      post.value = window.__SSR_DATA__.post
      delete window.__SSR_DATA__
    } else {
      const posts = await getPosts()
      post.value = findPostForCurrentRoute(posts)
    }
  }

  if (post.value) {
    await nextTick()
    loadTwikoo()
  }
}

async function getPosts() {
  if (!postsPromise) {
    postsPromise = fetch('/data.json')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load data.json: ${res.status}`)
        return res.json()
      })
      .then(data => data.posts || [])
  }
  return postsPromise
}

function findPostForCurrentRoute(posts) {
  const candidates = getRouteCandidates()
  const parts = route.path.split('/').filter(Boolean)
  const slug = parts.length >= 4 ? safeDecode(parts[3]) : ''

  return posts.find(p => candidates.includes(p.permalink)) || posts.find(p => p.slug === slug)
}

function isCurrentPost(candidate) {
  if (!candidate) return false
  return getRouteCandidates().includes(candidate.permalink)
}

function getRouteCandidates() {
  const paths = [route.path]
  if (typeof window !== 'undefined') paths.push(window.location.pathname)
  return [...new Set(paths.flatMap(path => [path, safeDecode(path)]).filter(Boolean))]
}

function safeDecode(value) {
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}

function primaryTopic(candidate) {
  return candidate?.tags?.[0] || candidate?.categories?.[0] || ''
}

function getTwikooPath() {
  return window.location.pathname || route.path
}

function loadTwikooScript(index = 0) {
  if (window.twikoo) return Promise.resolve()
  if (twikooScriptPromise) return twikooScriptPromise

  twikooScriptPromise = new Promise((resolve, reject) => {
    const source = TWIKOO_CDN_SOURCES[index]
    if (!source) {
      twikooScriptPromise = null
      reject(new Error('Twikoo script failed to load from all CDN sources'))
      return
    }

    const script = document.createElement('script')
    script.src = source
    script.async = true
    script.dataset.twikoo = 'true'
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      twikooScriptPromise = null
      loadTwikooScript(index + 1).then(resolve).catch(reject)
    }
    document.head.appendChild(script)
  })

  return twikooScriptPromise
}

async function loadTwikoo() {
  const commentPath = getTwikooPath()
  if (activeCommentPath.value === commentPath && commentsStatus.value === 'ready') return

  const envId = site.twikooEnvId
  if (!envId) {
    commentsStatus.value = 'error'
    commentsMessage.value = '评论服务未配置。'
    return
  }

  activeCommentPath.value = commentPath
  commentsStatus.value = 'loading'
  commentsMessage.value = ''

  try {
    await loadTwikooScript()
    await initTwikoo(envId, commentPath)
  } catch (e) {
    commentsStatus.value = 'error'
    commentsMessage.value = '评论加载失败，请稍后刷新重试。'
    console.error('Twikoo script load error:', e)
  }
}

async function initTwikoo(envId, commentPath) {
  try {
    const el = document.getElementById('tcomment')
    if (!el || !window.twikoo) return
    el.innerHTML = ''
    await window.twikoo.init({
      envId: envId,
      el: '#tcomment',
      path: commentPath,
      lang: 'zh-CN',
      onCommentLoaded: () => {
        commentsStatus.value = 'ready'
        commentsMessage.value = ''
      },
    })
    commentsStatus.value = 'ready'
  } catch (e) {
    commentsStatus.value = 'error'
    commentsMessage.value = '评论初始化失败，请稍后刷新重试。'
    console.error('Twikoo init error:', e)
  }
}
</script>

<template>
  <ReadingProgress />
  <article v-if="post" class="container article-shell">
    <header class="post-header">
      <div class="post-kicker" v-if="primaryTopic(post)">
        <a :href="`/tags/${primaryTopic(post)}/`">{{ primaryTopic(post) }}</a>
        <span>{{ post.readTime }} min read</span>
      </div>
      <h1 class="post-title">{{ post.title }}</h1>
      <p v-if="post.description" class="post-summary">{{ post.description }}</p>
      <PostMeta :post="post" />
    </header>

    <img v-if="post.cover || post.top_img"
         :src="assetUrl(post.cover || post.top_img)"
         alt="" class="post-cover" />

    <div class="post-content" v-html="post.content"></div>

    <div v-if="post.tags?.length" class="post-tags">
      <a v-for="tag in post.tags" :key="tag" :href="`/tags/${tag}/`" class="tag-chip">{{ tag }}</a>
    </div>

    <div class="comments-section">
      <h3 class="comments-title">评论</h3>
      <p v-if="commentsStatus === 'loading'" class="comments-hint">评论加载中...</p>
      <p v-if="commentsStatus === 'error'" class="comments-hint comments-hint-error">{{ commentsMessage }}</p>
      <div id="tcomment"></div>
    </div>
  </article>
  <div v-else class="container content-narrow" style="text-align:center;padding:80px 0;">
    <p style="color:var(--text-tertiary);font-size:16px;">Post not found.</p>
  </div>
</template>
