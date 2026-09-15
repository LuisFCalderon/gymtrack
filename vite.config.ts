import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import sqlocal from 'sqlocal/vite'

export default defineConfig({
  plugins: [
    react(),
    sqlocal(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
      // Sin esto no hay Service Worker en `npm run dev`, y sin Service Worker
      // el navegador no ofrece instalar la app.
      devOptions: { enabled: true, type: 'module', navigateFallback: 'index.html' },
      workbox: {
        // Al activar el aislamiento cross-origin, las respuestas cacheadas antes del cambio dejan
        // de servir para crear workers. Cambiar el cacheId fuerza una caché nueva y limpia.
        cacheId: 'gymtrack-coi',
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        // El runtime de SQLite (~860 KB de .wasm) supera el límite por defecto
        // y sin él la app no abriría sin conexión.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        name: 'Gym Track',
        short_name: 'Gym Track',
        description: 'Libreta digital personal de entrenamiento',
        theme_color: '#0b0b0d',
        background_color: '#0b0b0d',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'es',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  worker: { format: 'es' },
})
