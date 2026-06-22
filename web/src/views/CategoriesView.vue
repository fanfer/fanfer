<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import PostCard from '../components/PostCard.vue'

const route = useRoute()
const categories = ref({})
const posts = ref([])

const ssrData = inject('__ssrData', null)
if (ssrData?.categories) {
  categories.value = ssrData.categories
}
if (ssrData?.posts) {
  posts.value = ssrData.posts
}

onMounted(async () => {
  if (Object.keys(categories.value).length && (!currentCat.value || posts.value.length)) return
  if (window.__SSR_DATA__?.categories) {
    categories.value = window.__SSR_DATA__.categories
    posts.value = window.__SSR_DATA__.posts || posts.value
    delete window.__SSR_DATA__
    if (!currentCat.value || posts.value.length) return
  }
  const res = await fetch('/data.json')
  const data = await res.json()
  categories.value = data.categories || categories.value
  posts.value = data.posts || []
})

const currentCat = computed(() => route.params.category || null)
const filteredPosts = computed(() => {
  if (!currentCat.value) return []
  return posts.value.filter(p => p.categories?.includes(currentCat.value))
})
</script>

<template>
  <div class="container content-narrow">
    <div class="page-header">
      <h1 class="page-title">{{ currentCat || 'Categories' }}</h1>
    </div>
    <ul v-if="!currentCat" class="category-list">
      <li v-for="(count, cat) in categories" :key="cat" class="category-item">
        <a :href="`/categories/${cat}/`" class="category-name">{{ cat }}</a>
        <span class="category-count">{{ count }} posts</span>
      </li>
    </ul>
    <div v-else>
      <PostCard v-for="p in filteredPosts" :key="p.slug" :post="p" />
    </div>
  </div>
</template>
