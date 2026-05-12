<script setup>
import { ref, onMounted, inject } from 'vue'
import FriendLinks from '../components/FriendLinks.vue'

const links = ref({})

const ssrData = inject('__ssrData', null)
if (ssrData?.links) {
  links.value = ssrData.links
}

onMounted(async () => {
  if (Object.keys(links.value).length) return
  if (window.__SSR_DATA__?.links) {
    links.value = window.__SSR_DATA__.links
    delete window.__SSR_DATA__
  } else {
    const res = await fetch('/data.json')
    const data = await res.json()
    links.value = data.links || {}
  }
})
</script>

<template>
  <div class="container content-narrow">
    <div class="page-header">
      <h1 class="page-title">Friends</h1>
      <p class="page-desc">People I admire and sites I recommend</p>
    </div>
    <FriendLinks :links="links" />
  </div>
</template>
