<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()
const stats = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await api.get('/api/dashboard/stats')
    stats.value = data
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-loading="loading">
    <h2 style="margin: 0 0 20px;">仪表盘</h2>

    <el-row :gutter="20" v-if="stats">
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="文章数" :value="stats.postCount">
            <template #prefix><el-icon style="color: #409eff;"><Document /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="草稿数" :value="stats.draftCount">
            <template #prefix><el-icon style="color: #e6a23c;"><EditPen /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="分类数" :value="stats.categories.length">
            <template #prefix><el-icon style="color: #67c23a;"><FolderOpened /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="标签数" :value="stats.tags.length">
            <template #prefix><el-icon style="color: #f56c6c;"><PriceTag /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;" v-if="stats">
      <el-col :span="16">
        <el-card>
          <template #header><span>最近文章</span></template>
          <el-table :data="stats.recentPosts" stripe>
            <el-table-column prop="title" label="标题">
              <template #default="{ row }">
                <el-link type="primary" @click="router.push(`/posts/${row.filename}`)">{{ row.title }}</el-link>
              </template>
            </el-table-column>
            <el-table-column prop="date" label="日期" width="180" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header><span>快捷操作</span></template>
          <el-space direction="vertical" fill style="width: 100%;">
            <el-button type="primary" style="width: 100%;" @click="router.push('/posts/new')">新建文章</el-button>
            <el-button style="width: 100%;" @click="router.push('/drafts/new')">新建草稿</el-button>
            <el-button type="warning" style="width: 100%;" @click="router.push('/deploy')">部署站点</el-button>
          </el-space>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
