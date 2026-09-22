import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-square.jpg'],
      manifest: {
        name: 'Calcetto Paullo',
        short_name: 'Calcetto',
        description: 'Gestione delle partite di calcetto di Paullo',
        theme_color: '#101412',
        background_color: '#101412',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/logo-square.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any maskable',
          },
          {
            src: '/logo-square.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
