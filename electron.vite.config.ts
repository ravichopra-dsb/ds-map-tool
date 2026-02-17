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
    root: '.',
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'index.html')
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src')
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
