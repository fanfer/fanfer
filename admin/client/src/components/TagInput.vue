<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  suggestions: { type: Array, default: () => [] },
  placeholder: { type: String, default: '输入后回车添加' },
})

const emit = defineEmits(['update:modelValue'])
const inputValue = ref('')

const filteredSuggestions = computed(() => {
  if (!inputValue.value) return []
  return props.suggestions.filter(s =>
    s.toLowerCase().includes(inputValue.value.toLowerCase()) && !props.modelValue.includes(s)
  ).slice(0, 5)
})

function addTag(tag) {
  tag = tag.trim()
  if (tag && !props.modelValue.includes(tag)) {
    emit('update:modelValue', [...props.modelValue, tag])
  }
  inputValue.value = ''
}

function removeTag(index) {
  const newTags = [...props.modelValue]
  newTags.splice(index, 1)
  emit('update:modelValue', newTags)
}

function handleKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    addTag(inputValue.value)
  }
}
</script>

<template>
  <div>
    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px;">
      <el-tag v-for="(tag, i) in modelValue" :key="i" closable @close="removeTag(i)">{{ tag }}</el-tag>
    </div>
    <el-input
      v-model="inputValue"
      :placeholder="placeholder"
      @keydown="handleKeydown"
      size="small"
    />
    <div v-if="filteredSuggestions.length" style="border: 1px solid #eee; border-radius: 4px; margin-top: 4px; max-height: 120px; overflow-y: auto;">
      <div
        v-for="s in filteredSuggestions"
        :key="s"
        style="padding: 6px 12px; cursor: pointer; font-size: 13px;"
        @click="addTag(s)"
        @mouseover="$event.target.style.background = '#f5f7fa'"
        @mouseout="$event.target.style.background = ''"
      >{{ s }}</div>
    </div>
  </div>
</template>
