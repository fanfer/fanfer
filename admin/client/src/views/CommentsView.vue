<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const comments = ref([])
const loading = ref(true)
const currentPage = ref(1)
const total = ref(0)
const readonly = ref(false)

async function loadComments() {
  loading.value = true
  try {
    const { data } = await api.get('/api/comments', { params: { page: currentPage.value, limit: 20 } })
    comments.value = data.result?.data || data.data || []
    total.value = data.result?.count || data.count || 0
    readonly.value = Boolean(data.result?.readonly)
  } catch (err) {
    comments.value = []
    total.value = 0
    ElMessage.error(err.response?.data?.error || '加载评论失败，请检查 Twikoo 配置')
  } finally {
    loading.value = false
  }
}

async function handleDelete(id) {
  await ElMessageBox.confirm('确定删除此评论？', '确认', { type: 'warning' })
  try {
    await api.delete(`/api/comments/${id}`)
    ElMessage.success('删除成功')
    loadComments()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '删除失败')
  }
}

function formatDate(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN')
}

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, '').substring(0, 100)
}

onMounted(loadComments)
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h2>评论管理</h2>
        <p class="page-subtitle">共 {{ total }} 条评论</p>
      </div>
    </div>

    <el-alert
      v-if="readonly"
      type="warning"
      :closable="false"
      title="当前未配置 TWIKOO_ADMIN_PASSWORD，仅显示最新评论，删除功能不可用。"
      style="margin-bottom: 16px;"
    />

    <el-card>
      <el-table :data="comments" v-loading="loading" stripe>
        <el-table-column label="昵称" width="120">
          <template #default="{ row }">{{ row.nick || '-' }}</template>
        </el-table-column>
        <el-table-column label="内容" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="stripHtml(row.comment)" placement="top">
              <span>{{ stripHtml(row.comment) }}...</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="页面" width="200">
          <template #default="{ row }">
            <el-link type="primary" :href="`https://fanfer.top${row.url || ''}`" target="_blank">{{ row.url || '-' }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ formatDate(row.created) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" type="danger" text :disabled="readonly" @click="handleDelete(row._id || row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="20"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadComments"
        />
      </div>
    </el-card>
  </div>
</template>
