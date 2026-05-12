<script setup>
import { ref, onMounted, inject } from 'vue'
import PostCard from '../components/PostCard.vue'

const posts = ref([])

const ssrData = inject('__ssrData', null)
if (ssrData?.posts) {
  posts.value = ssrData.posts
}

onMounted(async () => {
  if (posts.value.length) return
  if (window.__SSR_DATA__?.posts) {
    posts.value = window.__SSR_DATA__.posts
    delete window.__SSR_DATA__
  } else {
    const res = await fetch('/data.json')
    const data = await res.json()
    posts.value = data.posts || []
  }
})
</script>

<template>
  <div class="container content-narrow">
    <div v-if="posts.length">
      <PostCard :post="posts[0]" :featured="true" />
      <PostCard v-for="p in posts.slice(1)" :key="p.slug" :post="p" />
    </div>
    <div v-else style="text-align:center;padding:80px 0;">
      <p style="color:var(--text-tertiary);font-size:16px;">No posts yet.</p>
    </div>
  </div>
</template>
