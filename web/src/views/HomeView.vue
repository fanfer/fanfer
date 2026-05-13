<script setup>
import { ref, onMounted, onUnmounted, inject } from 'vue'
import PostCard from '../components/PostCard.vue'

const PAGE_SIZE = 10
const allPosts = ref([])
const visibleCount = ref(PAGE_SIZE)
const sentinel = ref(null)

const ssrData = inject('__ssrData', null)
if (ssrData?.posts) {
  allPosts.value = ssrData.posts
}

const visiblePosts = () => allPosts.value.slice(0, visibleCount.value)
const hasMore = () => visibleCount.value < allPosts.value.length

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
