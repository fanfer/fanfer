<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const post = ref(null)

onMounted(async () => {
  if (window.__SSR_DATA__?.post) {
    post.value = window.__SSR_DATA__.post
    delete window.__SSR_DATA__
  } else {
    const res = await fetch('/data.json')
    const data = await res.json()
    const posts = data.posts || []
    post.value = posts.find(p => p.permalink === route.path) || posts.find(p => {
      const parts = route.path.split('/').filter(Boolean)
      return parts.length >= 4 && p.slug === parts[3]
    })
  }

  if (post.value) {
    await nextTick()
    loadTwikoo()
  }
})

function loadTwikoo() {
  if (document.getElementById('twikoo-script')) return
  const s = document.createElement('script')
  s.id = 'twikoo-script'
  s.src = 'https://cdn.jsdelivr.net/npm/twikoo@1.6.40/dist/twikoo.all.min.js'
  s.onload = () => {
    window.twikoo?.init({
      envId: 'https://twikoo.loveadgai.workers.dev/',
      el: '#tcomment',
    })
  }
  document.head.appendChild(s)
}
</script>

<template>
  <article v-if="post" class="container content-narrow">
    <header class="post-header">
      <h1 class="post-title">{{ post.title }}</h1>
      <img v-if="post.cover || post.top_img" :src="post.cover?.startsWith('http') ? post.cover : `/assets/${post.cover || post.top_img}`" alt="" class="post-cover" />
      <div class="post-meta">
        <span v-if="post.date">{{ new Date(post.date).toISOString().slice(0, 10) }}</span>
        <span v-if="post.readTime" class="post-read-time">{{ post.readTime }} min read</span>
        <span v-if="post.categories?.length"> · {{ post.categories[0] }}</span>
      </div>
    </header>

    <div class="post-content" v-html="post.content"></div>

    <div v-if="post.tags?.length" class="post-tags">
      <a v-for="tag in post.tags" :key="tag" :href="`/tags/${tag}/`" class="tag-chip">{{ tag }}</a>
    </div>

    <div class="comments-section">
      <h3 class="comments-title">Comments</h3>
      <div id="tcomment"></div>
    </div>
  </article>
  <div v-else class="container content-narrow" style="text-align:center;padding:48px 0;">
    <p style="color:#999;">Post not found.</p>
  </div>
</template>
