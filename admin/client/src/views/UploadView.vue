<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const files = ref([])
const loading = ref(true)
const uploading = ref(false)

async function loadFiles() {
  loading.value = true
  try {
    const { data } = await api.get('/api/upload')
    files.value = data
  } finally {
    loading.value = false
  }
}

async function handleUpload(uploadFile) {
  uploading.value = true
  try {
    const reader = new FileReader()
    const base64 = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(uploadFile.raw)
    })
    const { data } = await api.post('/api/upload', {
      filename: uploadFile.raw.name,
      data: base64,
    })
    ElMessage.success('上传成功')
    loadFiles()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '上传失败')
  } finally {
    uploading.value = false
  }
}

async function handleDelete(filename) {
  await ElMessageBox.confirm('确定删除此文件？', '确认', { type: 'warning' })
  try {
    await api.delete(`/api/upload/${filename}`)
    ElMessage.success('删除成功')
    loadFiles()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '删除失败')
  }
}

function copyUrl(url) {
  navigator.clipboard.writeText(url)
  ElMessage.success('已复制 URL')
}

onMounted(loadFiles)
</script>

<template>
  <div v-loading="loading">
    <h2>图片管理</h2>

    <el-card style="margin-bottom: 16px;">
      <el-upload
        drag
        :auto-upload="false"
        :on-change="handleUpload"
        :show-file-list="false"
        accept="image/*"
        v-loading="uploading"
      >
        <el-icon style="font-size: 40px; color: #909399;"><UploadFilled /></el-icon>
        <div style="margin-top: 8px;">拖拽文件到此处或点击上传</div>
      </el-upload>
    </el-card>

    <el-card>
      <el-row :gutter="16">
        <el-col v-for="file in files" :key="file.filename" :span="4" style="margin-bottom: 16px;">
          <el-card shadow="hover" :body-style="{ padding: '8px' }">
            <el-image :src="file.url" fit="cover" style="width: 100%; height: 120px; border-radius: 4px;" :preview-src-list="[file.url]" />
            <div style="margin-top: 8px; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ file.filename }}</div>
            <div style="margin-top: 8px; display: flex; gap: 4px;">
              <el-button size="small" type="primary" text @click="copyUrl(file.url)">复制URL</el-button>
              <el-button size="small" type="danger" text @click="handleDelete(file.filename)">删除</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>
