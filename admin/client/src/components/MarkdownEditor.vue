<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

const props = defineProps({
  modelValue: { type: String, default: '' },
  height: { type: String, default: '600px' },
})

const emit = defineEmits(['update:modelValue'])

const content = ref(props.modelValue)
const previewHtml = ref('')
let debounceTimer = null

marked.setOptions({
  breaks: true,
  gfm: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  },
})

function updatePreview() {
  previewHtml.value = marked.parse(content.value || '')
}

function debouncedUpdate() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    updatePreview()
    emit('update:modelValue', content.value)
  }, 300)
}

watch(() => props.modelValue, (val) => {
  if (val !== content.value) {
    content.value = val
    updatePreview()
  }
})

// Initial render
updatePreview()

onBeforeUnmount(() => clearTimeout(debounceTimer))

function insertText(before, after = '') {
  const textarea = document.querySelector('.md-editor-textarea')
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = content.value.substring(start, end)
  const newText = content.value.substring(0, start) + before + selected + after + content.value.substring(end)
  content.value = newText
  debouncedUpdate()
}

function bold() { insertText('**', '**') }
function italic() { insertText('*', '*') }
function code() { insertText('`', '`') }
function link() { insertText('[', '](url)') }
function image() { insertText('![', '](url)') }
function heading() { insertText('\n## ', '\n') }
function codeblock() { insertText('\n```\n', '\n```\n') }
</script>

<template>
  <div style="border: 1px solid #dcdfe6; border-radius: 4px; overflow: hidden;">
    <div style="display: flex; gap: 4px; padding: 8px; background: #fafafa; border-bottom: 1px solid #dcdfe6;">
      <el-button size="small" text @click="bold"><strong>B</strong></el-button>
      <el-button size="small" text @click="italic"><em>I</em></el-button>
      <el-button size="small" text @click="code">&lt;/&gt;</el-button>
      <el-button size="small" text @click="heading">H2</el-button>
      <el-button size="small" text @click="link">Link</el-button>
      <el-button size="small" text @click="image">Img</el-button>
      <el-button size="small" text @click="codeblock">Code</el-button>
    </div>
    <div :style="{ display: 'flex', height }">
      <textarea
        class="md-editor-textarea"
        v-model="content"
        @input="debouncedUpdate"
        style="flex: 1; border: none; outline: none; resize: none; padding: 12px; font-family: 'SF Mono', Monaco, monospace; font-size: 14px; line-height: 1.6;"
        placeholder="输入 Markdown 内容..."
      />
      <div
        style="flex: 1; border-left: 1px solid #dcdfe6; overflow-y: auto; padding: 12px;"
        v-html="previewHtml"
      />
    </div>
  </div>
</template>
