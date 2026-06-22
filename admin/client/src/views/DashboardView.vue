<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api'

const router = useRouter()
const stats = ref(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await api.get('/api/dashboard/stats')
    stats.value = data
  } catch (err) {
    error.value = err.response?.data?.error || '仪表盘加载失败'
    ElMessage.error(error.value)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-loading="loading">
    <div class="page-header">
      <div>
        <h2>仪表盘</h2>
        <p class="page-subtitle">内容、素材和发布入口</p>
      </div>
      <el-button type="primary" @click="router.push('/posts/new')">
        <el-icon><Plus /></el-icon> 新建文章
      </el-button>
    </div>

    <el-alert v-if="error" type="error" :closable="false" :title="error" />

    <el-row :gutter="20" v-if="stats">
      <el-col :xs="24" :sm="12" :lg="4">
        <el-card class="metric-card" shadow="never">
          <el-statistic title="文章数" :value="stats.postCount || stats.posts || 0">
            <template #prefix><el-icon style="color: #409eff;"><Document /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="4">
        <el-card class="metric-card" shadow="never">
          <el-statistic title="草稿数" :value="stats.draftCount || stats.drafts || 0">
            <template #prefix><el-icon style="color: #e6a23c;"><EditPen /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="4">
        <el-card class="metric-card" shadow="never">
          <el-statistic title="页面数" :value="stats.pageCount || stats.pages || 0">
            <template #prefix><el-icon style="color: #8b5cf6;"><Files /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="4">
        <el-card class="metric-card" shadow="never">
          <el-statistic title="素材数" :value="stats.assetCount || stats.assets || 0">
            <template #prefix><el-icon style="color: #0ea5e9;"><Picture /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="4">
        <el-card class="metric-card" shadow="never">
          <el-statistic title="分类数" :value="stats.categories?.length || 0">
            <template #prefix><el-icon style="color: #67c23a;"><FolderOpened /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="4">
        <el-card class="metric-card" shadow="never">
          <el-statistic title="标签数" :value="stats.tags?.length || 0">
            <template #prefix><el-icon style="color: #f56c6c;"><PriceTag /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="dashboard-grid" v-if="stats">
      <el-col :xs="24" :lg="16">
        <el-card shadow="never">
          <template #header><span>最近文章</span></template>
          <el-table :data="stats.recentPosts || []" stripe>
            <el-table-column prop="title" label="标题">
              <template #default="{ row }">
                <el-link type="primary" @click="router.push(`/posts/${row.filename}`)">{{ row.title }}</el-link>
              </template>
            </el-table-column>
            <el-table-column prop="date" label="日期" width="180" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="never">
          <template #header><span>快捷操作</span></template>
          <el-space direction="vertical" fill style="width: 100%;">
            <el-button type="primary" style="width: 100%;" @click="router.push('/posts/new')">
              <el-icon><Plus /></el-icon> 新建文章
            </el-button>
            <el-button style="width: 100%;" @click="router.push('/drafts/new')">
              <el-icon><EditPen /></el-icon> 新建草稿
            </el-button>
            <el-button type="warning" style="width: 100%;" @click="router.push('/deploy')">
              <el-icon><Upload /></el-icon> 部署站点
            </el-button>
          </el-space>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
