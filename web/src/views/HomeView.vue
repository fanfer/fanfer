<script setup>
import { ref, onMounted } from 'vue'
import PostCard from '../components/PostCard.vue'

const posts = ref([])
const page = ref(1)
const total = ref(0)

onMounted(async () => {
  if (window.__SSR_DATA__) {
    posts.value = window.__SSR_DATA__.posts || []
    total.value = window.__SSR_DATA__.total || 0
    page.value = window.__SSR_DATA__.page || 1
    delete window.__SSR_DATA__
  } else {
    const res = await fetch('/data.json')
    const data = await res.json()
    posts.value = (data.posts || []).slice(0, 10)
    total.value = data.posts?.length || 0
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
