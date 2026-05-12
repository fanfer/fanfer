<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api'
import MarkdownEditor from '../components/MarkdownEditor.vue'

const props = defineProps({ slug: String })
const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const frontmatter = ref({})
const content = ref('')

async function loadPage() {
  loading.value = true
  try {
    const { data } = await api.get(`/api/pages/${props.slug}`)
    frontmatter.value = data.frontmatter || {}
    content.value = data.content || ''
  } catch {
    ElMessage.error('加载页面失败')
    router.push('/pages')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    await api.put(`/api/pages/${props.slug}`, { frontmatter: frontmatter.value, content: content.value })
    ElMessage.success('保存成功')
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadPage)
</script>

<template>
  <div v-loading="loading">
    <div class="page-header">
      <h2>编辑页面: {{ slug }}</h2>
      <el-space>
        <el-button @click="router.push('/pages')">返回</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </el-space>
    </div>

    <el-card style="margin-bottom: 16px;">
      <el-form label-width="80px" label-position="left">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="标题">
              <el-input v-model="frontmatter.title" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="日期">
              <el-input v-model="frontmatter.date" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card>
      <MarkdownEditor v-model="content" height="500px" />
    </el-card>
  </div>
</template>
