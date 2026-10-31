import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 7777,
    // 演示后端运行在 17777 端口
    proxy: { '/api': 'http://localhost:17777/' },
  },
})
