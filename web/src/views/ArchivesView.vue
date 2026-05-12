<script setup>
import { ref, computed, onMounted } from 'vue'

const posts = ref([])

onMounted(async () => {
  if (window.__SSR_DATA__?.posts) {
    posts.value = window.__SSR_DATA__.posts
    delete window.__SSR_DATA__
  } else {
    const res = await fetch('/data.json')
    const data = await res.json()
    posts.value = data.posts || []
  }
})

const grouped = computed(() => {
  const map = {}
  for (const p of posts.value) {
    const year = p.date ? new Date(p.date).getFullYear() : 'Unknown'
    if (!map[year]) map[year] = []
    map[year].push(p)
  }
  return Object.entries(map).sort((a, b) => b[0] - a[0])
})
</script>

<template>
  <div class="container content-narrow">
    <div class="page-header">
      <h1 class="page-title">Archives</h1>
      <p class="page-desc">Total {{ posts.length }} posts</p>
    </div>
    <div v-for="[year, list] in grouped" :key="year">
      <h2 class="archive-year">{{ year }}</h2>
      <div v-for="p in list" :key="p.slug" class="archive-item">
        <span class="archive-date">{{ new Date(p.date).toISOString().slice(5, 10) }}</span>
        <a :href="p.permalink" class="archive-title">{{ p.title }}</a>
      </div>
    </div>
  </div>
</template>
