<script setup>
import { computed } from 'vue'
import site from '../data/site.js'

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
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
})
</script>

<template>
  <!-- Featured: cover as background with text overlay -->
  <article v-if="featured && coverSrc" class="post-card post-featured">
    <a :href="post.permalink" class="post-featured-link">
      <div class="post-featured-bg" :style="{ backgroundImage: `url(${coverSrc})` }"></div>
      <div class="post-featured-overlay">
        <div class="post-card-meta">
          <img :src="site.avatar" :alt="site.author" class="avatar-sm" />
          <span class="author-name">{{ site.author }}</span>
          <span class="meta-dot">·</span>
          <span class="meta-date">{{ dateStr }}</span>
        </div>
        <h2 class="post-card-title">{{ post.title }}</h2>
        <p v-if="post.description" class="post-card-desc">{{ post.description }}</p>
        <div class="post-card-bottom">
          <div v-if="post.tags?.length" class="post-card-tags">
            <span v-for="tag in post.tags.slice(0, 2)" :key="tag" class="tag-chip">{{ tag }}</span>
          </div>
          <span class="meta-read">{{ post.readTime }} min read</span>
        </div>
      </div>
    </a>
  </article>

  <!-- Featured without cover: simple layout -->
  <article v-else-if="featured" class="post-card post-featured post-featured-nocover">
    <div class="post-card-body">
      <div class="post-card-meta">
        <img :src="site.avatar" :alt="site.author" class="avatar-sm" />
        <span class="author-name">{{ site.author }}</span>
        <span class="meta-dot">·</span>
        <span class="meta-date">{{ dateStr }}</span>
        <span class="meta-dot">·</span>
        <span class="meta-read">{{ post.readTime }} min read</span>
      </div>
      <h2 class="post-card-title"><a :href="post.permalink">{{ post.title }}</a></h2>
      <p v-if="post.description" class="post-card-desc">{{ post.description }}</p>
      <div class="post-card-bottom">
        <div v-if="post.tags?.length" class="post-card-tags">
          <a v-for="tag in post.tags.slice(0, 2)" :key="tag" :href="`/tags/${tag}/`" class="tag-chip">{{ tag }}</a>
        </div>
      </div>
    </div>
  </article>

  <!-- Regular post card -->
  <article v-else class="post-card">
    <div class="post-card-body">
      <div class="post-card-meta">
        <img :src="site.avatar" :alt="site.author" class="avatar-sm" />
        <span class="author-name">{{ site.author }}</span>
        <span class="meta-dot">·</span>
        <span class="meta-date">{{ dateStr }}</span>
        <span class="meta-dot">·</span>
        <span class="meta-read">{{ post.readTime }} min read</span>
      </div>
      <h2 class="post-card-title"><a :href="post.permalink">{{ post.title }}</a></h2>
      <p v-if="post.description" class="post-card-desc">{{ post.description }}</p>
      <div class="post-card-bottom">
        <div v-if="post.tags?.length" class="post-card-tags">
          <a v-for="tag in post.tags.slice(0, 2)" :key="tag" :href="`/tags/${tag}/`" class="tag-chip">{{ tag }}</a>
        </div>
      </div>
    </div>
    <img v-if="coverSrc" :src="coverSrc" :alt="post.title" class="post-card-cover" loading="lazy" />
  </article>
</template>
