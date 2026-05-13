import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const HMR_PORT = process.env.HMR_PORT ? Number(process.env.HMR_PORT) : undefined

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: { usePolling: true, interval: 300 },
    hmr: HMR_PORT ? { host: 'localhost', clientPort: HMR_PORT } : true,
  },
})
