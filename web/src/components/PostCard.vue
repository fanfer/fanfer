<script setup>
import { computed } from 'vue'
import PostMeta from './PostMeta.vue'

const props = defineProps({
  post: { type: Object, required: true },
  featured: { type: Boolean, default: false },
})

const coverSrc = computed(() => {
  if (!props.post.cover) return null
  if (props.post.cover.startsWith('http')) return props.post.cover
  return `/assets/${props.post.cover}`
})

const dateStr = computed(() => {
  if (!props.post.date) return ''
  const d = new Date(props.post.date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
</script>

<template>
  <article :class="['post-card', featured ? 'post-featured' : '']">
    <div class="post-card-body">
      <PostMeta :post="post" />
      <h2 class="post-card-title">
        <a :href="post.permalink">{{ post.title }}</a>
      </h2>
      <p v-if="post.description" class="post-card-desc">{{ post.description }}</p>
      <div v-if="post.tags?.length" class="post-card-tags">
        <a v-for="tag in post.tags" :key="tag" :href="`/tags/${tag}/`" class="tag-chip">{{ tag }}</a>
      </div>
    </div>
    <img v-if="coverSrc" :src="coverSrc" :alt="post.title"
         :class="featured ? 'post-featured-cover' : 'post-card-cover'" loading="lazy" />
  </article>
</template>
