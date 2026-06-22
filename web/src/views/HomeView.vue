<script setup>
import { computed, ref, onMounted, onUnmounted, inject } from 'vue'
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

const visiblePosts = () => allPosts.value.slice(0, visibleCount.value)
const hasMore = () => visibleCount.value < allPosts.value.length
const topicPreview = computed(() => {
  const topics = new Set()
  allPosts.value.forEach(post => {
    ;(post.tags || []).forEach(tag => topics.add(tag))
  })
  return Array.from(topics).slice(0, 4)
})

let observer = null

function loadMore() {
  if (!hasMore()) return
  visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, allPosts.value.length)
}

onMounted(async () => {
  // Always fetch full post list on client for infinite scroll
  const res = await fetch('/data.json')
  const data = await res.json()
  allPosts.value = data.posts || []
  totalPosts.value = allPosts.value.length

  observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) loadMore()
  }, { rootMargin: '200px' })
  if (sentinel.value) observer.observe(sentinel.value)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<template>
  <div class="container content-narrow">
    <section class="home-intro">
      <p class="home-kicker">{{ site.subtitle }}</p>
      <h1 class="home-title">{{ site.title }}</h1>
      <p class="home-desc">{{ site.description }}</p>
      <div class="home-meta-row">
        <span>{{ totalPosts || allPosts.length }} posts</span>
        <span v-for="topic in topicPreview" :key="topic">{{ topic }}</span>
      </div>
    </section>

    <div v-if="allPosts.length">
      <PostCard :post="allPosts[0]" :featured="true" />
      <PostCard v-for="p in visiblePosts().slice(1)" :key="p.slug" :post="p" />
      <div ref="sentinel" v-if="hasMore()" style="height:1px;"></div>
    </div>
    <div v-else style="text-align:center;padding:80px 0;">
      <p style="color:var(--text-tertiary);font-size:16px;">No posts yet.</p>
    </div>
  </div>
</template>
