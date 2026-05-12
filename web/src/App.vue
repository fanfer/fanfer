<script setup>
import NavHeader from './components/NavHeader.vue'
import SiteFooter from './components/Footer.vue'
</script>

<template>
  <NavHeader />
  <main class="site-main">
    <router-view />
  </main>
  <SiteFooter />
</template>
