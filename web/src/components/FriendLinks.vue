<script setup>
defineProps({
  links: { type: Object, required: true },
})
</script>

<template>
  <div v-for="(group, groupName) in links" :key="groupName" class="link-group">
    <h3 class="link-group-title">{{ groupName }}</h3>
    <p v-if="group.desc" class="link-group-desc">{{ group.desc }}</p>
    <div class="link-grid">
      <a v-for="link in group.link" :key="link.name" :href="link.link" target="_blank" rel="noopener" class="link-card">
        <img :src="link.avatar" :alt="link.name" class="link-avatar" loading="lazy" />
        <div class="link-info">
          <div class="link-name">{{ link.name }}</div>
          <div class="link-desc">{{ link.descr }}</div>
        </div>
      </a>
    </div>
  </div>
</template>
