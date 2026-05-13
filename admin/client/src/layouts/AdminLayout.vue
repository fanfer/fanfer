<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const isCollapse = ref(false)

function handleLogout() {
  auth.logout()
  router.push('/login')
}

const menuItems = [
  { path: '/', icon: 'DataBoard', label: '仪表盘' },
  { path: '/posts', icon: 'Document', label: '文章管理' },
  { path: '/drafts', icon: 'EditPen', label: '草稿管理' },
  { path: '/pdf-upload', icon: 'DocumentCopy', label: 'PDF 导入' },
  { path: '/pages', icon: 'Notebook', label: '页面管理' },
  { path: '/categories-tags', icon: 'PriceTag', label: '分类/标签' },
  { path: '/links', icon: 'Link', label: '友链管理' },
  { path: '/creativity', icon: 'MagicStick', label: '技术栈' },
  { path: '/uploads', icon: 'Picture', label: '图片管理' },
  { path: '/comments', icon: 'ChatDotSquare', label: '评论管理' },
  { path: '/config', icon: 'Setting', label: '站点配置' },
  { path: '/deploy', icon: 'Upload', label: '部署' },
]
</script>

<template>
  <el-container style="height: 100vh">
    <el-aside :width="isCollapse ? '64px' : '220px'" style="transition: width 0.3s; background: #001529">
      <div style="height: 60px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; font-weight: bold;">
        <span v-if="!isCollapse">Fanfer Admin</span>
        <span v-else>FA</span>
      </div>
      <el-menu
        :default-active="$route.path"
        :collapse="isCollapse"
        background-color="#001529"
        text-color="#ffffffa6"
        active-text-color="#fff"
        router
        :collapse-transition="false"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #eee; background: #fff;">
        <el-icon style="cursor: pointer; font-size: 20px;" @click="isCollapse = !isCollapse">
          <Fold v-if="!isCollapse" />
          <Expand v-else />
        </el-icon>
        <div style="display: flex; align-items: center; gap: 16px;">
          <span>{{ auth.username }}</span>
          <el-button type="danger" text @click="handleLogout">退出</el-button>
        </div>
      </el-header>

      <el-main style="background: #f5f5f5; padding: 20px;">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
