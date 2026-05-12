<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const linkData = ref([])
const loading = ref(true)
const dialogVisible = ref(false)
const editForm = ref({})
const editGroupIndex = ref(-1)
const editLinkIndex = ref(-1)
const newGroupName = ref('')

async function loadData() {
  loading.value = true
  try {
    const { data } = await api.get('/api/data/link')
    linkData.value = Array.isArray(data) ? data : []
  } finally {
    loading.value = false
  }
}

async function saveData() {
  try {
    await api.put('/api/data/link', linkData.value)
    ElMessage.success('保存成功')
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '保存失败')
  }
}

function addGroup() {
  if (!newGroupName.value) return
  linkData.value.push({ class_name: newGroupName.value, link_list: [] })
  newGroupName.value = ''
  saveData()
}

async function removeGroup(index) {
  await ElMessageBox.confirm('确定删除此分组？', '确认')
  linkData.value.splice(index, 1)
  saveData()
}

function openEditLink(groupIdx, linkIdx) {
  editGroupIndex.value = groupIdx
  editLinkIndex.value = linkIdx
  editForm.value = linkIdx >= 0
    ? { ...linkData.value[groupIdx].link_list[linkIdx] }
    : { name: '', link: '', avatar: '', descr: '', siteshot: '' }
  dialogVisible.value = true
}

function saveLink() {
  const g = editGroupIndex.value
  if (editLinkIndex.value >= 0) {
    linkData.value[g].link_list[editLinkIndex.value] = { ...editForm.value }
  } else {
    linkData.value[g].link_list.push({ ...editForm.value })
  }
  dialogVisible.value = false
  saveData()
}

async function removeLink(groupIdx, linkIdx) {
  await ElMessageBox.confirm('确定删除此友链？', '确认')
  linkData.value[groupIdx].link_list.splice(linkIdx, 1)
  saveData()
}

onMounted(loadData)
</script>

<template>
  <div v-loading="loading">
    <div class="page-header">
      <h2>友链管理</h2>
      <div style="display: flex; gap: 8px;">
        <el-input v-model="newGroupName" placeholder="新分组名" style="width: 200px;" />
        <el-button type="primary" @click="addGroup">添加分组</el-button>
      </div>
    </div>

    <el-card v-for="(group, gi) in linkData" :key="gi" style="margin-bottom: 16px;">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>{{ group.class_name }}</span>
          <el-space>
            <el-button size="small" type="primary" @click="openEditLink(gi, -1)">添加友链</el-button>
            <el-button size="small" type="danger" @click="removeGroup(gi)">删除分组</el-button>
          </el-space>
        </div>
      </template>
      <el-table :data="group.link_list" size="small">
        <el-table-column prop="name" label="名称" width="120" />
        <el-table-column prop="link" label="链接">
          <template #default="{ row }">
            <el-link type="primary" :href="row.link" target="_blank">{{ row.link }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="descr" label="描述" width="200" />
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button size="small" type="primary" text @click="openEditLink(gi, scope.$index)">编辑</el-button>
            <el-button size="small" type="danger" text @click="removeLink(gi, scope.$index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="编辑友链" width="500px">
      <el-form label-width="80px">
        <el-form-item label="名称"><el-input v-model="editForm.name" /></el-form-item>
        <el-form-item label="链接"><el-input v-model="editForm.link" /></el-form-item>
        <el-form-item label="头像"><el-input v-model="editForm.avatar" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="editForm.descr" /></el-form-item>
        <el-form-item label="截图"><el-input v-model="editForm.siteshot" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveLink">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
