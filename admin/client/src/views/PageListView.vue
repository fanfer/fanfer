<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()
const pages = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await api.get('/api/pages')
    pages.value = data.items
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h2>页面管理</h2>
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
