<script setup>
import site from '../data/site.js'
</script>

<template>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-links">
        <a v-for="item in site.nav" :key="item.path" :href="item.path">{{ item.name }}</a>
      </div>
      <p>&copy; {{ new Date().getFullYear() }} {{ site.title }}. All rights reserved.</p>
    </div>
  </footer>
</template>
