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
    title.value = file.raw.name.replace(/\.zip$/i, '')
  }
}

async function handleUpload() {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择 ZIP 压缩包')
    return
  }

  uploading.value = true
  progress.value = 10

  try {
    const reader = new FileReader()
    const base64 = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(selectedFile.value)
    })

    progress.value = 40

    const { data } = await api.post('/api/drafts/latex', {
      filename: selectedFile.value.name,
      data: base64,
      title: title.value || undefined,
    })

    progress.value = 100
    ElMessage.success('LaTeX 已转换为草稿')
    router.push(`/drafts/${data.filename}`)
  } catch (err) {
    ElMessage.error(err.response?.data?.error || 'LaTeX 处理失败')
  } finally {
    uploading.value = false
    progress.value = 0
  }
}
</script>

<template>
  <div>
    <h2>LaTeX 导入</h2>

    <el-card>
      <el-form label-width="80px" style="max-width: 600px;">
        <el-form-item label="ZIP 压缩包">
          <el-upload
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :show-file-list="false"
            accept=".zip"
            :disabled="uploading"
          >
            <el-icon style="font-size: 40px; color: #909399;"><UploadFilled /></el-icon>
            <div v-if="selectedFile" style="margin-top: 8px; color: #409eff;">{{ selectedFile.name }}</div>
            <div v-else style="margin-top: 8px;">拖拽 ZIP 到此处或点击选择</div>
            <div style="font-size: 12px; color: #909399; margin-top: 4px;">包含 .tex 文件及图片资源的压缩包</div>
          </el-upload>
        </el-form-item>

        <el-form-item label="标题">
          <el-input v-model="title" placeholder="留空则从 LaTeX 文件中提取" />
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
