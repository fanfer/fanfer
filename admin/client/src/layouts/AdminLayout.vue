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
  { path: '/latex-upload', icon: 'Notebook', label: 'LaTeX 导入' },
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
  <el-container class="admin-shell">
    <el-aside :width="isCollapse ? '64px' : '220px'" class="admin-aside">
      <div class="admin-brand">
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
      <el-header class="admin-topbar">
        <el-icon class="admin-collapse" @click="isCollapse = !isCollapse">
          <Fold v-if="!isCollapse" />
          <Expand v-else />
        </el-icon>
        <div class="admin-userbar">
          <span>{{ auth.username }}</span>
          <el-button type="danger" text @click="handleLogout">退出</el-button>
        </div>
      </el-header>

      <el-main class="admin-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
