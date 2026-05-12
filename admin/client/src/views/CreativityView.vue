<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const items = ref([])
const loading = ref(true)
const dialogVisible = ref(false)
const editForm = ref({})
const editIndex = ref(-1)

async function loadData() {
  loading.value = true
  try {
    const { data } = await api.get('/api/data/creativity')
    items.value = Array.isArray(data) ? data : []
  } finally {
    loading.value = false
  }
}

async function saveData() {
  try {
    await api.put('/api/data/creativity', items.value)
    ElMessage.success('保存成功')
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '保存失败')
  }
}

function openEdit(index) {
  editIndex.value = index
  editForm.value = index >= 0 ? { ...items.value[index] } : { name: '', icon: '', color: '' }
  dialogVisible.value = true
}

function saveItem() {
  if (editIndex.value >= 0) {
    items.value[editIndex.value] = { ...editForm.value }
  } else {
    items.value.push({ ...editForm.value })
  }
  dialogVisible.value = false
  saveData()
}

async function removeItem(index) {
  await ElMessageBox.confirm('确定删除？', '确认')
  items.value.splice(index, 1)
  saveData()
}

onMounted(loadData)
</script>

<template>
  <div v-loading="loading">
    <div class="page-header">
      <h2>技术栈管理</h2>
      <el-button type="primary" @click="openEdit(-1)">添加技术栈</el-button>
    </div>

    <el-card>
      <el-table :data="items" stripe>
        <el-table-column prop="name" label="名称" width="150" />
        <el-table-column prop="icon" label="图标">
          <template #default="{ row }">
            <el-link :href="row.icon" target="_blank">{{ row.icon }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="color" label="颜色" width="100">
          <template #default="{ row }">
            <div style="width: 24px; height: 24px; border-radius: 4px;" :style="{ background: row.color }" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button size="small" type="primary" text @click="openEdit(scope.$index)">编辑</el-button>
            <el-button size="small" type="danger" text @click="removeItem(scope.$index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="编辑技术栈" width="400px">
      <el-form label-width="60px">
        <el-form-item label="名称"><el-input v-model="editForm.name" /></el-form-item>
        <el-form-item label="图标"><el-input v-model="editForm.icon" /></el-form-item>
        <el-form-item label="颜色"><el-input v-model="editForm.color" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveItem">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
