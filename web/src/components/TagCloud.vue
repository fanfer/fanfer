<script setup>
defineProps({
  tags: { type: Object, required: true },
})
</script>

<template>
  <div class="tag-cloud">
    <a v-for="(count, tag) in tags" :key="tag"
       :href="`/tags/${tag}/`"
       class="tag-cloud-item">
      {{ tag }}<span class="count">({{ count }})</span>
    </a>
  </div>
</template>
