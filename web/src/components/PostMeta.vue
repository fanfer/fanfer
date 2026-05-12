<script setup>
import site from '../data/site.js'

const props = defineProps({
  post: { type: Object, required: true },
})

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}
</script>

<template>
  <div class="post-meta">
    <img :src="site.avatar" :alt="site.author" class="avatar-md" />
    <div class="post-meta-info">
      <span class="author-name">{{ site.author }}</span>
      <div class="meta-detail">
        <span>{{ formatDate(post.date) }}</span>
        <span class="meta-dot">·</span>
        <span>{{ post.readTime }} min read</span>
        <template v-if="post.categories?.length">
          <span class="meta-dot">·</span>
          <span>{{ post.categories[0] }}</span>
        </template>
      </div>
    </div>
  </div>
</template>
