<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import TagCloud from '../components/TagCloud.vue'
import PostCard from '../components/PostCard.vue'

const route = useRoute()
const tags = ref({})
const posts = ref([])

const ssrData = inject('__ssrData', null)
if (ssrData?.tags) {
  tags.value = ssrData.tags
}

onMounted(async () => {
  if (Object.keys(tags.value).length) return
  if (window.__SSR_DATA__?.tags) {
    tags.value = window.__SSR_DATA__.tags
    delete window.__SSR_DATA__
  } else {
    const res = await fetch('/data.json')
    const data = await res.json()
    tags.value = data.tags || {}
    posts.value = data.posts || []
  }
})

const currentTag = computed(() => route.params.tag || null)
const filteredPosts = computed(() => {
  if (!currentTag.value) return []
  return posts.value.filter(p => p.tags?.includes(currentTag.value))
})
</script>

<template>
  <div class="container content-narrow">
    <div class="page-header">
      <h1 class="page-title">{{ currentTag || 'Tags' }}</h1>
      <p v-if="currentTag" class="page-desc">{{ filteredPosts.length }} posts tagged</p>
    </div>
    <TagCloud v-if="!currentTag" :tags="tags" />
    <div v-else>
      <PostCard v-for="p in filteredPosts" :key="p.slug" :post="p" />
    </div>
  </div>
</template>
