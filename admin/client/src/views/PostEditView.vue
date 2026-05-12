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
  title: '',
  date: '',
  tags: [],
  categories: [],
  description: '',
  top_img: '/assets/background.JPG',
  cover: '',
})
const content = ref('')

const allTags = ref([])
const allCategories = ref([])

const isNew = computed(() => !props.filename)

async function loadMeta() {
  try {
    const { data } = await api.get('/api/dashboard/stats')
    allTags.value = data.tags.map(t => t.name)
    allCategories.value = data.categories.map(c => c.name)
  } catch {}
}

async function loadPost() {
  if (!props.filename) return
  loading.value = true
  try {
    const { data } = await api.get(`/api/posts/${props.filename}`)
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
  } catch (err) {
    ElMessage.error('加载文章失败')
    router.push('/posts')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!form.value.title) {
    ElMessage.warning('请输入标题')
    return
  }
  saving.value = true
  try {
    const payload = { ...form.value, content: content.value }
    if (isNew.value) {
      const { data } = await api.post('/api/posts', payload)
      ElMessage.success('创建成功')
      router.replace(`/posts/${data.filename}`)
    } else {
      await api.put(`/api/posts/${props.filename}`, payload)
      ElMessage.success('保存成功')
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadMeta()
  loadPost()
})
</script>

<template>
  <div v-loading="loading">
    <div class="page-header">
      <h2>{{ isNew ? '新建文章' : '编辑文章' }}</h2>
      <el-space>
        <el-button @click="router.push('/posts')">返回</el-button>
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
              <TagInput v-model="form.tags" :suggestions="allTags" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类">
              <TagInput v-model="form.categories" :suggestions="allCategories" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="文章简介" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="头图">
              <el-input v-model="form.top_img" placeholder="/assets/background.JPG" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="封面">
              <el-input v-model="form.cover" placeholder="https://..." />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card>
      <MarkdownEditor v-model="content" height="600px" />
    </el-card>
  </div>
</template>
