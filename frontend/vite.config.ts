import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Backend chưa bật CORS nên dev gọi API qua proxy thay vì gọi thẳng sang port 8082.
// Đổi địa chỉ backend bằng biến môi trường BACKEND_URL khi port 8082 đang bị chiếm.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': process.env.BACKEND_URL ?? 'http://localhost:8082',
    },
  },
  test: {
    environment: 'jsdom',
  },
})
