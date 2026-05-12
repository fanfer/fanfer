<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api'
import MarkdownEditor from '../components/MarkdownEditor.vue'
import TagInput from '../components/TagInput.vue'

const props = defineProps({ filename: String })
const router = useRouter()
const loading = ref(false)
const saving = ref(false)

const form = ref({
  title: '', date: '', tags: [], categories: [], description: '',
  top_img: '/assets/background.JPG', cover: '',
})
const content = ref('')

const isNew = computed(() => !props.filename)

async function loadDraft() {
  if (!props.filename) return
  loading.value = true
  try {
    const { data } = await api.get(`/api/drafts/${props.filename}`)
    form.value = {
      title: data.frontmatter.title || '',
      date: data.frontmatter.date || '',
      tags: Array.isArray(data.frontmatter.tags) ? data.frontmatter.tags : [],
      categories: Array.isArray(data.frontmatter.categories) ? data.frontmatter.categories : [],
      description: data.frontmatter.description || '',
      top_img: data.frontmatter.top_img || '',
      cover: data.frontmatter.cover || '',
    }
    content.value = data.content || ''
  } catch {
    ElMessage.error('加载草稿失败')
    router.push('/drafts')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!form.value.title) { ElMessage.warning('请输入标题'); return }
  saving.value = true
  try {
    const payload = { ...form.value, content: content.value }
    if (isNew.value) {
      const { data } = await api.post('/api/drafts', payload)
      ElMessage.success('创建成功')
      router.replace(`/drafts/${data.filename}`)
    } else {
      await api.put(`/api/drafts/${props.filename}`, payload)
      ElMessage.success('保存成功')
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handlePublish() {
  if (isNew.value) { ElMessage.warning('请先保存草稿'); return }
  try {
    await api.post('/api/drafts/publish', { filename: props.filename })
    ElMessage.success('发布成功')
    router.push('/posts')
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '发布失败')
  }
}

onMounted(loadDraft)
</script>

<template>
  <div v-loading="loading">
    <div class="page-header">
      <h2>{{ isNew ? '新建草稿' : '编辑草稿' }}</h2>
      <el-space>
        <el-button @click="router.push('/drafts')">返回</el-button>
        <el-button type="success" @click="handlePublish">发布</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </el-space>
    </div>

    <el-card style="margin-bottom: 16px;">
      <el-form label-width="80px" label-position="left">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="标题">
              <el-input v-model="form.title" placeholder="文章标题" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="日期">
              <el-input v-model="form.date" placeholder="2024-01-01 00:00:00" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="标签">
              <TagInput v-model="form.tags" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类">
              <TagInput v-model="form.categories" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <MarkdownEditor v-model="content" height="500px" />
    </el-card>
  </div>
</template>
