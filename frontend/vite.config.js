import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    proxy: {
      '/api': 'http://localhost:3005',
      '/videos': 'http://localhost:3005',
      '/exports': 'http://localhost:3005',
      '/character-uploads': 'http://localhost:3005',
    },
  },
})
