<script setup>
import { computed } from 'vue'

const props = defineProps({
  post: { type: Object, required: true },
})

const dateStr = computed(() => {
  if (!props.post.date) return ''
  const d = new Date(props.post.date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
</script>

<template>
  <div class="post-card-meta">
    <span v-if="dateStr">{{ dateStr }}</span>
    <span v-if="post.readTime" class="post-read-time">{{ post.readTime }} min read</span>
  </div>
</template>
