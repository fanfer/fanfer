<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const activeTab = ref('hexo')
const hexoConfig = ref('')
const butterflyConfig = ref('')
const loading = ref(true)
const saving = ref(false)

async function loadConfigs() {
  loading.value = true
  try {
    const [hexo, butterfly] = await Promise.all([
      api.get('/api/config/hexo'),
      api.get('/api/config/butterfly'),
    ])
    hexoConfig.value = typeof hexo.data === 'string' ? hexo.data : JSON.stringify(hexo.data, null, 2)
    butterflyConfig.value = typeof butterfly.data === 'string' ? butterfly.data : JSON.stringify(butterfly.data, null, 2)
  } catch (err) {
    ElMessage.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    const type = activeTab.value
    const content = type === 'hexo' ? hexoConfig.value : butterflyConfig.value
    let data
    try {
      data = JSON.parse(content)
    } catch {
      ElMessage.error('JSON 格式错误，请检查')
      return
    }
    await api.put(`/api/config/${type}`, data)
    ElMessage.success('保存成功')
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadConfigs)
</script>

<template>
  <div v-loading="loading">
    <div class="page-header">
      <h2>站点配置</h2>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </div>

    <el-card>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="Hexo 配置" name="hexo">
          <el-input v-model="hexoConfig" type="textarea" :rows="30" style="font-family: monospace;" />
        </el-tab-pane>
        <el-tab-pane label="Butterfly 配置" name="butterfly">
          <el-input v-model="butterflyConfig" type="textarea" :rows="30" style="font-family: monospace;" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>
