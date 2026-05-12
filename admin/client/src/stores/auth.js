import { defineStore } from 'pinia'
import api from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('admin_token') || '',
    username: localStorage.getItem('admin_user') || '',
    verified: false,
  }),
  actions: {
    async login(username, password) {
      const { data } = await api.post('/api/auth/login', { username, password })
      this.token = data.token
      this.username = data.username
      this.verified = true
      localStorage.setItem('admin_token', data.token)
      localStorage.setItem('admin_user', data.username)
    },
    async verify() {
      if (!this.token) throw new Error('No token')
      await api.post('/api/auth/verify')
      this.verified = true
    },
    logout() {
      this.token = ''
      this.username = ''
      this.verified = false
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
    },
  },
})
