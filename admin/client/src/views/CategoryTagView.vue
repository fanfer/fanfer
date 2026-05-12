<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const categories = ref([])
const tags = ref([])
const loading = ref(true)
const newCategory = ref('')
const newTag = ref('')

async function loadStats() {
  loading.value = true
  try {
    const { data } = await api.get('/api/dashboard/stats')
    categories.value = data.categories
    tags.value = data.tags
  } finally {
    loading.value = false
  }
}

async function handleRename(type, oldName, newName) {
  if (!newName || oldName === newName) return
  try {
    const { data } = await api.get('/api/posts', { params: { limit: 1000 } })
    const posts = data.items.filter(p => {
      const arr = Array.isArray(p[type]) ? p[type] : [p[type]].filter(Boolean)
      return arr.includes(oldName)
    })

    for (const p of posts) {
      const full = await api.get(`/api/posts/${p.filename}`)
      const fm = full.data.frontmatter
      const arr = Array.isArray(fm[type]) ? [...fm[type]] : [fm[type]].filter(Boolean)
      const idx = arr.indexOf(oldName)
      if (idx >= 0) arr[idx] = newName
      fm[type] = arr
      await api.put(`/api/posts/${p.filename}`, { ...fm, content: full.data.content })
    }

    ElMessage.success(`已更新 ${posts.length} 篇文章`)
    loadStats()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '操作失败')
  }
}

async function handleDelete(type, name) {
  await ElMessageBox.confirm(`确定要删除${type === 'categories' ? '分类' : '标签'} "${name}" 吗？所有文章中的此${type === 'categories' ? '分类' : '标签'}将被移除。`, '确认删除', { type: 'warning' })
  try {
    const { data } = await api.get('/api/posts', { params: { limit: 1000 } })
    const posts = data.items.filter(p => {
      const arr = Array.isArray(p[type]) ? p[type] : [p[type]].filter(Boolean)
      return arr.includes(name)
    })

    for (const p of posts) {
      const full = await api.get(`/api/posts/${p.filename}`)
      const fm = full.data.frontmatter
      const arr = Array.isArray(fm[type]) ? [...fm[type]] : [fm[type]].filter(Boolean)
      fm[type] = arr.filter(t => t !== name)
      await api.put(`/api/posts/${p.filename}`, { ...fm, content: full.data.content })
    }

    ElMessage.success(`已从 ${posts.length} 篇文章中移除`)
    loadStats()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '操作失败')
  }
}

onMounted(loadStats)
</script>

<template>
  <div v-loading="loading">
    <h2>分类/标签管理</h2>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header><span>分类 ({{ categories.length }})</span></template>
          <div style="margin-bottom: 12px; display: flex; gap: 8px;">
            <el-input v-model="newCategory" placeholder="新分类名" size="small" />
            <el-button size="small" type="primary" @click="categories.push({ name: newCategory, count: 0 }); newCategory = ''">添加</el-button>
          </div>
          <el-table :data="categories" size="small">
            <el-table-column prop="name" label="名称">
              <template #default="{ row }">
                <el-input v-model="row.name" size="small" @blur="handleRename('categories', row._origName || row.name, row.name)" @focus="row._origName = row.name" />
              </template>
            </el-table-column>
            <el-table-column prop="count" label="文章数" width="80" />
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button size="small" type="danger" text @click="handleDelete('categories', row.name)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header><span>标签 ({{ tags.length }})</span></template>
          <div style="margin-bottom: 12px; display: flex; gap: 8px;">
            <el-input v-model="newTag" placeholder="新标签名" size="small" />
            <el-button size="small" type="primary" @click="tags.push({ name: newTag, count: 0 }); newTag = ''">添加</el-button>
          </div>
          <el-table :data="tags" size="small">
            <el-table-column prop="name" label="名称">
              <template #default="{ row }">
                <el-input v-model="row.name" size="small" @blur="handleRename('tags', row._origName || row.name, row.name)" @focus="row._origName = row.name" />
              </template>
            </el-table-column>
            <el-table-column prop="count" label="文章数" width="80" />
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button size="small" type="danger" text @click="handleDelete('tags', row.name)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
