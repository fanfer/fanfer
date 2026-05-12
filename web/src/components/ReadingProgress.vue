<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const progress = ref(0)

function updateProgress() {
  const scrollTop = window.scrollY
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  progress.value = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0
}

onMounted(() => { window.addEventListener('scroll', updateProgress, { passive: true }) })
onUnmounted(() => { window.removeEventListener('scroll', updateProgress) })
</script>

<template>
  <div class="reading-progress" :style="{ width: progress + '%' }"></div>
</template>
