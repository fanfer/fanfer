<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const vercelHookUrl = ref(localStorage.getItem('vercel_hook') || '')
const triggering = ref(false)

async function triggerDeploy() {
  if (!vercelHookUrl.value) {
    ElMessage.warning('请先配置 Vercel Deploy Hook URL')
    return
  }
  triggering.value = true
  try {
    await fetch(vercelHookUrl.value, { method: 'POST' })
    ElMessage.success('已触发 Vercel 部署，请等待几分钟完成')
    localStorage.setItem('vercel_hook', vercelHookUrl.value)
  } catch {
    ElMessage.error('触发部署失败，请检查 Hook URL')
  } finally {
    triggering.value = false
  }
}
</script>

<template>
  <div>
    <h2>部署</h2>

    <el-card style="margin-bottom: 16px;">
      <template #header><span>部署流程说明</span></template>
      <el-alert type="info" :closable="false">
        <p style="margin: 0;">本博客使用 <strong>Vercel</strong> 自动部署。当你在后台编辑文章/配置并保存后，更改会自动提交到 GitHub，Vercel 会自动触发重新部署。</p>
        <p style="margin: 8px 0 0;"><strong>流程：</strong>编辑内容 → 自动提交到 GitHub → Vercel 自动部署 → 网站更新</p>
      </el-alert>
    </el-card>

    <el-card>
      <template #header><span>手动触发部署（可选）</span></template>
      <p style="color: #666; margin-bottom: 16px;">如果你需要立即触发一次 Vercel 部署（例如修改了环境变量后），可以配置 Vercel Deploy Hook：</p>
      <el-form label-width="120px">
        <el-form-item label="Deploy Hook">
          <el-input v-model="vercelHookUrl" placeholder="https://api.vercel.com/v1/integrations/deploy/..." />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="triggering" @click="triggerDeploy">触发部署</el-button>
        </el-form-item>
      </el-form>
      <el-divider />
      <el-text type="info" size="small">
        在 Vercel 项目设置 → Deploy Hooks 中创建 Hook，将 URL 粘贴到上方。
      </el-text>
    </el-card>
  </div>
</template>
