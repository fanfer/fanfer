<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const router = useRouter()
const posts = ref([])
const loading = ref(true)
const search = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

async function loadPosts() {
  loading.value = true
  try {
    const { data } = await api.get('/api/posts', {
      params: { page: currentPage.value, limit: pageSize.value, search: search.value },
    })
    posts.value = data.items || []
    total.value = data.total || 0
  } catch (err) {
    posts.value = []
    total.value = 0
    ElMessage.error(err.response?.data?.error || '文章列表加载失败')
  } finally {
    loading.value = false
  }
}

async function handleDelete(filename) {
  await ElMessageBox.confirm('确定要删除这篇文章吗？', '确认删除', { type: 'warning' })
  try {
    await api.delete(`/api/posts/${filename}`)
    ElMessage.success('删除成功')
    loadPosts()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '删除失败')
  }
}

function formatTags(row) {
  const tags = Array.isArray(row.tags) ? row.tags : [row.tags].filter(Boolean)
  return tags.join(', ')
}

function formatCategories(row) {
  const cats = Array.isArray(row.categories) ? row.categories : [row.categories].filter(Boolean)
  return cats.join(', ')
}

onMounted(loadPosts)
</script>

<template>
  <div>
    <div class="page-header">
      <h2>文章管理</h2>
      <el-button type="primary" @click="router.push('/posts/new')">
        <el-icon><Plus /></el-icon> 新建文章
      </el-button>
    </div>

    <el-card>
      <div style="margin-bottom: 16px;">
        <el-input v-model="search" placeholder="搜索文章标题..." style="width: 300px;" clearable @clear="loadPosts" @keyup.enter="loadPosts">
          <template #append>
            <el-button @click="loadPosts"><el-icon><Search /></el-icon></el-button>
          </template>
        </el-input>
      </div>

      <el-table :data="posts" v-loading="loading" stripe>
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" @click="router.push(`/posts/${row.filename}`)">{{ row.title }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="日期" width="170">
          <template #default="{ row }">{{ row.date || '-' }}</template>
        </el-table-column>
        <el-table-column label="分类" width="120">
          <template #default="{ row }">{{ formatCategories(row) || '-' }}</template>
        </el-table-column>
        <el-table-column label="标签" width="200">
          <template #default="{ row }">
            <el-tag v-for="t in (Array.isArray(row.tags) ? row.tags : [row.tags].filter(Boolean))" :key="t" size="small" style="margin: 2px;">{{ t }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" text @click="router.push(`/posts/${row.filename}`)">编辑</el-button>
            <el-button size="small" type="danger" text @click="handleDelete(row.filename)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadPosts"
        />
      </div>
    </el-card>
  </div>
</template>
