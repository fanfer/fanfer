<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api'

const router = useRouter()
const title = ref('')
const uploading = ref(false)
const progress = ref(0)
const selectedFile = ref(null)

function handleFileChange(file) {
  selectedFile.value = file.raw
  if (!title.value) {
    title.value = file.raw.name.replace(/\.pdf$/i, '')
  }
}

async function handleUpload() {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择 PDF 文件')
    return
  }

  uploading.value = true
  progress.value = 10

  try {
    const arrayBuf = await selectedFile.value.arrayBuffer()
    progress.value = 40

    const params = new URLSearchParams()
    if (title.value) params.set('title', title.value)
    params.set('filename', selectedFile.value.name)

    const { data } = await api.post(`/api/drafts/pdf?${params}`, arrayBuf, {
      headers: { 'Content-Type': 'application/octet-stream' },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    })

    progress.value = 100
    ElMessage.success('PDF 已转换为草稿')
    router.push(`/drafts/${data.filename}`)
  } catch (err) {
    ElMessage.error(err.response?.data?.error || 'PDF 处理失败')
  } finally {
    uploading.value = false
    progress.value = 0
  }
}
</script>

<template>
  <div>
    <h2>PDF 导入</h2>

    <el-card>
      <el-form label-width="80px" style="max-width: 600px;">
        <el-form-item label="PDF 文件">
          <el-upload
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :show-file-list="false"
            accept=".pdf"
            :disabled="uploading"
          >
            <el-icon style="font-size: 40px; color: #909399;"><UploadFilled /></el-icon>
            <div v-if="selectedFile" style="margin-top: 8px; color: #409eff;">{{ selectedFile.name }}</div>
            <div v-else style="margin-top: 8px;">拖拽 PDF 到此处或点击选择</div>
          </el-upload>
        </el-form-item>

        <el-form-item label="标题">
          <el-input v-model="title" placeholder="留空则从 PDF 元数据提取" />
        </el-form-item>

        <el-form-item v-if="uploading">
          <el-progress :percentage="progress" :stroke-width="10" style="width: 100%;" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="uploading" @click="handleUpload">
            {{ uploading ? '处理中...' : '上传并转换' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
