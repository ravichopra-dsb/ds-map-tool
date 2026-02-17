import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: resolve(__dirname, '../web'),
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
      rollupOptions: {
        input: resolve(__dirname, '../web/index.html')
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, '../web/src')
      }
    },
    plugins: [
      react({
        babel: {
          plugins: ['babel-plugin-react-compiler']
        }
      }),
      tailwindcss()
    ],
    optimizeDeps: {
      exclude: ['@electric-sql/pglite']
    }
  }
})
