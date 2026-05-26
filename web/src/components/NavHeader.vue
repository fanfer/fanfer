<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import site from '../data/site.js'

const route = useRoute()
const menuOpen = ref(false)

const isActive = (path) => {
  if (path === '/') return route.path === '/' ? 'active' : ''
  return route.path.startsWith(path) ? 'active' : ''
}

const toggleMenu = () => { menuOpen.value = !menuOpen.value }
const closeMenu = () => { menuOpen.value = false }
</script>

<template>
  <header class="nav-header">
    <div class="nav-inner">
      <div class="nav-logo">
        <a href="/">{{ site.title }}</a>
      </div>
      <div class="nav-right">
        <nav class="nav-links">
          <a v-for="item in site.nav" :key="item.path" :href="item.path" :class="isActive(item.path)">
            {{ item.name }}
          </a>
        </nav>
        <span class="nav-avatar-wrap" :title="site.author">
          <img :src="site.avatar" :alt="site.author" class="nav-avatar" />
        </span>
        <button class="nav-hamburger" :class="{ open: menuOpen }" @click="toggleMenu" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>
  <div class="mobile-menu" :class="{ open: menuOpen }">
    <a v-for="item in site.nav" :key="item.path" :href="item.path" @click="closeMenu">
      {{ item.name }}
    </a>
  </div>
</template>
