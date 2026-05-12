import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'Dashboard', component: () => import('../views/DashboardView.vue') },
      { path: 'posts', name: 'Posts', component: () => import('../views/PostListView.vue') },
      { path: 'posts/new', name: 'PostNew', component: () => import('../views/PostEditView.vue') },
      { path: 'posts/:filename', name: 'PostEdit', component: () => import('../views/PostEditView.vue'), props: true },
      { path: 'drafts', name: 'Drafts', component: () => import('../views/DraftListView.vue') },
      { path: 'drafts/new', name: 'DraftNew', component: () => import('../views/DraftEditView.vue') },
      { path: 'drafts/:filename', name: 'DraftEdit', component: () => import('../views/DraftEditView.vue'), props: true },
      { path: 'pages', name: 'Pages', component: () => import('../views/PageListView.vue') },
      { path: 'pages/:slug', name: 'PageEdit', component: () => import('../views/PageEditView.vue'), props: true },
      { path: 'categories-tags', name: 'CategoryTag', component: () => import('../views/CategoryTagView.vue') },
      { path: 'links', name: 'Links', component: () => import('../views/LinkListView.vue') },
      { path: 'creativity', name: 'Creativity', component: () => import('../views/CreativityView.vue') },
      { path: 'config', name: 'Config', component: () => import('../views/ConfigView.vue') },
      { path: 'uploads', name: 'Uploads', component: () => import('../views/UploadView.vue') },
      { path: 'comments', name: 'Comments', component: () => import('../views/CommentsView.vue') },
      { path: 'deploy', name: 'Deploy', component: () => import('../views/DeployView.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth !== false) {
    if (!auth.token) return next('/login')
    if (!auth.verified) {
      try {
        await auth.verify()
      } catch {
        auth.logout()
        return next('/login')
      }
    }
  }
  next()
})

export default router
