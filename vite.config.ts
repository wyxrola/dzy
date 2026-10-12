import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

function legacyPreviewAssets(): Plugin {
  const legacyRoot = path.resolve(process.cwd(), 'legacy-content')

  return {
    name: 'legacy-preview-assets',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const rawPath = (request.url ?? '/').split('?')[0]
        if (!rawPath.startsWith('/__legacy/')) {
          next()
          return
        }

        const requestPath = decodeURIComponent(rawPath.slice('/__legacy'.length))
        const filePath = path.resolve(legacyRoot, `.${requestPath}`)

        if (!filePath.startsWith(`${legacyRoot}${path.sep}`) || !fs.existsSync(filePath)) {
          next()
          return
        }

        const stat = fs.statSync(filePath)
        if (!stat.isFile()) {
          next()
          return
        }

        response.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream')
        response.setHeader('Content-Length', stat.size)
        response.setHeader('Cache-Control', 'no-store')
        response.end(fs.readFileSync(filePath))
      })
    },
  }
}

export default defineConfig({
  base: '/dzy/',
  publicDir: 'site-public',
  plugins: [react(), legacyPreviewAssets()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('leaflet')) return 'map'
          if (id.includes('react')) return 'react'
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
