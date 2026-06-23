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
if (ssrData?.posts) {
  posts.value = ssrData.posts
}

onMounted(async () => {
  if (Object.keys(tags.value).length && (!currentTag.value || posts.value.length)) return
  if (window.__SSR_DATA__?.tags) {
    tags.value = window.__SSR_DATA__.tags
    posts.value = window.__SSR_DATA__.posts || posts.value
    delete window.__SSR_DATA__
    if (!currentTag.value || posts.value.length) return
  }
  const res = await fetch('/data.json')
  const data = await res.json()
  tags.value = data.tags || tags.value
  posts.value = data.posts || []
})

const currentTag = computed(() => route.params.tag || null)
const filteredPosts = computed(() => {
  if (!currentTag.value) return []
  return posts.value.filter(p => p.tags?.includes(currentTag.value))
})
</script>

<template>
  <div class="container page-shell">
    <div class="page-header">
      <p class="page-kicker">Topics</p>
      <h1 class="page-title">{{ currentTag || 'Tags' }}</h1>
      <p class="page-desc">
        {{ currentTag ? `${filteredPosts.length} 篇关于 ${currentTag} 的文章。` : '按主题浏览长期积累的技术笔记。' }}
      </p>
    </div>
    <TagCloud v-if="!currentTag" :tags="tags" />
    <div v-else class="post-stream page-post-stream">
      <PostCard v-for="p in filteredPosts" :key="p.slug" :post="p" />
    </div>
  </div>
</template>
