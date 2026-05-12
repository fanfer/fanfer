import { createSSRApp } from 'vue'
import App from './App.vue'
import { createRouter } from './router.js'
import './style.css'

export function createApp() {
  const app = createSSRApp(App)
  const router = createRouter()
  app.use(router)
  return { app, router }
}

// Client-side mount
if (typeof window !== 'undefined') {
  const { app, router } = createApp()
  router.isReady().then(() => app.mount('#app'))
}
