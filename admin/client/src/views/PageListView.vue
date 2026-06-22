<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api'

const router = useRouter()
const pages = ref([])
const loading = ref(true)
const total = ref(0)

onMounted(async () => {
  try {
    const { data } = await api.get('/api/pages')
    pages.value = data.items || []
    total.value = data.total ?? pages.value.length
  } catch (err) {
    pages.value = []
    total.value = 0
    ElMessage.error(err.response?.data?.error || '页面列表加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h2>页面管理</h2>
        <p class="page-subtitle">共 {{ total }} 个页面</p>
      </div>
    </div>
    <el-card>
      <el-table :data="pages" v-loading="loading" stripe>
        <el-table-column prop="slug" label="页面标识" width="200" />
        <el-table-column label="标题">
          <template #default="{ row }">{{ row.frontmatter?.title || row.slug }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="primary" text @click="router.push(`/pages/${row.slug}`)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
