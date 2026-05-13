import { createRouter as _createRouter, createMemoryHistory, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('./views/HomeView.vue') },
  { path: '/archives/', component: () => import('./views/ArchivesView.vue') },
  { path: '/tags/', component: () => import('./views/TagsView.vue') },
  { path: '/tags/:tag/', component: () => import('./views/TagsView.vue') },
  { path: '/categories/', component: () => import('./views/CategoriesView.vue') },
  { path: '/categories/:category/', component: () => import('./views/CategoriesView.vue') },
  { path: '/:year/:month/:day/:title/', component: () => import('./views/PostView.vue') },
  { path: '/:pathMatch(.*)*', component: () => import('./views/HomeView.vue') },
]

export function createRouter() {
  return _createRouter({
    history: typeof window !== 'undefined' ? createWebHistory() : createMemoryHistory(),
    routes,
    scrollBehavior: () => ({ top: 0 }),
  })
}
