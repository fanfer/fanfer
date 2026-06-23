<script setup>
import { computed, ref, onMounted, onUnmounted, inject, nextTick } from 'vue'
import PostCard from '../components/PostCard.vue'
import site from '../data/site.js'

const PAGE_SIZE = 10
const allPosts = ref([])
const totalPosts = ref(0)
const visibleCount = ref(PAGE_SIZE)
const sentinel = ref(null)

const ssrData = inject('__ssrData', null)
if (ssrData?.posts) {
  allPosts.value = ssrData.posts
  totalPosts.value = ssrData.total || ssrData.posts.length
}

const featuredPost = computed(() => allPosts.value[0] || null)
const streamPosts = computed(() => allPosts.value.slice(1, visibleCount.value))
const hasMore = computed(() => visibleCount.value < allPosts.value.length)
const topicPreview = computed(() => {
  const topics = new Set()
  allPosts.value.forEach(post => {
    ;(post.tags || []).forEach(tag => topics.add(tag))
  })
  return Array.from(topics).slice(0, 8)
})
const yearCount = computed(() => {
  const years = new Set(allPosts.value.map(post => post.date ? new Date(post.date).getFullYear() : null).filter(Boolean))
  return years.size
})
const sidePosts = computed(() => allPosts.value.slice(1, 5))
const topicCounts = computed(() => {
  const counts = {}
  allPosts.value.forEach(post => {
    ;(post.tags || []).forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1
    })
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
})

let observer = null

function loadMore() {
  if (!hasMore.value) return
  visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, allPosts.value.length)
}

async function observeSentinel() {
  await nextTick()
  if (observer && sentinel.value) observer.observe(sentinel.value)
}

onMounted(async () => {
  observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) loadMore()
  }, { rootMargin: '200px' })

  observeSentinel()

  try {
    const res = await fetch('/data.json')
    const data = await res.json()
    allPosts.value = data.posts || allPosts.value
    totalPosts.value = allPosts.value.length
    observeSentinel()
  } catch {
    totalPosts.value = allPosts.value.length
  }
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<template>
  <div class="home-page">
    <section class="container home-intro">
      <div class="home-intro-copy">
        <p class="home-kicker">{{ site.subtitle }}</p>
        <h1 class="home-title">{{ site.title }}</h1>
        <p class="home-desc">记录 AI 系统、工程实践、论文阅读与长期问题。</p>
      </div>
      <div class="home-masthead-meta" aria-label="Site statistics">
        <span><strong>{{ totalPosts || allPosts.length }}</strong><small>posts</small></span>
        <span><strong>{{ yearCount }}</strong><small>years</small></span>
        <span><strong>{{ topicPreview.length }}</strong><small>topics</small></span>
      </div>
    </section>

    <nav v-if="topicPreview.length" class="home-topic-rail" aria-label="Topics">
      <div class="container home-topic-inner">
        <a v-for="topic in topicPreview" :key="topic" :href="`/tags/${topic}/`">{{ topic }}</a>
      </div>
    </nav>

    <div v-if="allPosts.length" class="container home-layout">
      <main class="home-feed">
        <div class="section-label">
          <span>Latest stories</span>
        </div>
        <PostCard v-if="featuredPost" :post="featuredPost" :featured="true" />
        <div class="post-stream">
          <PostCard v-for="p in streamPosts" :key="p.slug" :post="p" />
        </div>
        <div v-if="hasMore" class="load-more-wrap">
          <button class="load-more-button" type="button" @click="loadMore">加载更多</button>
          <div ref="sentinel" class="load-more-sentinel"></div>
        </div>
      </main>

      <aside class="home-aside" aria-label="Recommended reading">
        <section class="aside-section">
          <h2>Editors picks</h2>
          <a v-for="p in sidePosts" :key="p.slug" :href="p.permalink" class="aside-post">
            <span>{{ p.title }}</span>
            <small>{{ p.readTime }} min read</small>
          </a>
        </section>
        <section class="aside-section">
          <h2>Topics</h2>
          <div class="aside-topic-list">
            <a v-for="[topic, count] in topicCounts" :key="topic" :href="`/tags/${topic}/`">
              <span>{{ topic }}</span>
              <small>{{ count }}</small>
            </a>
          </div>
        </section>
      </aside>
    </div>
    <div v-else class="container empty-state">
      <p>No posts yet.</p>
    </div>
  </div>
</template>
