<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import site from '../data/site.js'

const route = useRoute()
const isActive = (path) => route.path === path ? 'active' : ''
</script>

<template>
  <header class="nav-header">
    <div class="nav-inner">
      <div class="nav-logo">
        <a href="/">{{ site.title }}</a>
      </div>
      <nav class="nav-links">
        <a v-for="item in site.nav" :key="item.path" :href="item.path" :class="isActive(item.path)">
          {{ item.name }}
        </a>
      </nav>
    </div>
  </header>
</template>
