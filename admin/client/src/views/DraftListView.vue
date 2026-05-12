<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const router = useRouter()
const drafts = ref([])
const loading = ref(true)

async function loadDrafts() {
  loading.value = true
  try {
    const { data } = await api.get('/api/drafts')
    drafts.value = data.items
  } finally {
    loading.value = false
  }
}

async function handlePublish(filename) {
  await ElMessageBox.confirm('确定要发布这篇草稿吗？', '确认发布')
  try {
    await api.post('/api/drafts/publish', { filename })
    ElMessage.success('发布成功')
    loadDrafts()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '发布失败')
  }
}

async function handleDelete(filename) {
  await ElMessageBox.confirm('确定要删除这篇草稿吗？', '确认删除', { type: 'warning' })
  try {
    await api.delete(`/api/drafts/${filename}`)
    ElMessage.success('删除成功')
    loadDrafts()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '删除失败')
  }
}

onMounted(loadDrafts)
</script>

<template>
  <div>
    <div class="page-header">
      <h2>草稿管理</h2>
      <el-button type="primary" @click="router.push('/drafts/new')">
        <el-icon><Plus /></el-icon> 新建草稿
      </el-button>
    </div>

    <el-card>
      <el-table :data="drafts" v-loading="loading" stripe>
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" @click="router.push(`/drafts/${row.filename}`)">{{ row.title }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="date" label="日期" width="170">
          <template #default="{ row }">{{ row.date || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" text @click="router.push(`/drafts/${row.filename}`)">编辑</el-button>
            <el-button size="small" type="success" text @click="handlePublish(row.filename)">发布</el-button>
            <el-button size="small" type="danger" text @click="handleDelete(row.filename)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
