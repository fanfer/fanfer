<script setup>
import { ref, onMounted, inject } from 'vue'
import PostCard from '../components/PostCard.vue'

const posts = ref([])

// SSR: read data from provide/inject
const ssrData = inject('__ssrData', null)
if (ssrData?.posts) {
  posts.value = ssrData.posts
}

// Client: hydrate from window.__SSR_DATA__ or fetch
onMounted(async () => {
  if (posts.value.length) return
  if (window.__SSR_DATA__?.posts) {
    posts.value = window.__SSR_DATA__.posts
    delete window.__SSR_DATA__
  } else {
    const res = await fetch('/data.json')
    const data = await res.json()
    posts.value = (data.posts || []).slice(0, 10)
  }
})
</script>

<template>
  <div class="container content-narrow">
    <div v-if="posts.length">
      <PostCard :post="posts[0]" :featured="true" />
      <PostCard v-for="p in posts.slice(1)" :key="p.slug" :post="p" />
    </div>
    <p v-else style="text-align:center;padding:48px 0;color:#999;">No posts yet.</p>
  </div>
</template>
