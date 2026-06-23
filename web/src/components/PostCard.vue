<script setup>
import { computed } from 'vue'
import site from '../data/site.js'
import { assetUrl } from '../utils/assets.js'

const props = defineProps({
  post: { type: Object, required: true },
  featured: { type: Boolean, default: false },
})

const coverSrc = computed(() => {
  return assetUrl(props.post.cover)
})

const primaryTopic = computed(() => {
  return props.post.tags?.[0] || props.post.categories?.[0] || 'Notes'
})

const descriptionText = computed(() => {
  if (props.post.description) return props.post.description
  if (props.post.tags?.length) return props.post.tags.slice(0, 3).join(' / ')
  return ''
})

const dateStr = computed(() => {
  if (!props.post.date) return ''
  const d = new Date(props.post.date)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
})
</script>

<template>
  <article class="post-card" :class="{ 'post-featured': featured }">
    <div class="post-card-body">
      <div class="post-card-meta">
        <img :src="site.avatar" :alt="site.author" class="avatar-sm" />
        <span class="author-name">{{ site.author }}</span>
        <span class="meta-dot">·</span>
        <span class="meta-date">{{ dateStr }}</span>
        <span class="meta-dot">·</span>
        <a class="post-topic" :href="`/tags/${primaryTopic}/`">{{ primaryTopic }}</a>
      </div>
      <h2 class="post-card-title"><a :href="post.permalink">{{ post.title }}</a></h2>
      <p v-if="descriptionText" class="post-card-desc">{{ descriptionText }}</p>
      <div class="post-card-bottom">
        <div v-if="post.tags?.length" class="post-card-tags">
          <a v-for="tag in post.tags.slice(0, featured ? 3 : 2)" :key="tag" :href="`/tags/${tag}/`" class="tag-chip">{{ tag }}</a>
        </div>
        <span class="meta-read">{{ post.readTime }} min read</span>
      </div>
    </div>
    <a v-if="coverSrc" :href="post.permalink" class="post-card-media" aria-hidden="true" tabindex="-1">
      <img :src="coverSrc" :alt="post.title" class="post-card-cover" loading="lazy" />
    </a>
  </article>
</template>
