<script setup>
import { ref, onMounted } from 'vue'

const content = ref('')

onMounted(async () => {
  if (window.__SSR_DATA__?.content) {
    content.value = window.__SSR_DATA__.content
    delete window.__SSR_DATA__
  } else {
    const res = await fetch('/data.json')
    const data = await res.json()
    content.value = data.about || ''
  }
})
</script>

<template>
  <div class="container content-narrow">
    <div class="page-header">
      <h1 class="page-title">About</h1>
    </div>
    <div class="about-content" v-html="content"></div>
  </div>
</template>
