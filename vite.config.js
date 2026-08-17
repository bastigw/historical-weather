import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // The manifest format has no way to react to prefers-color-scheme, so
      // these cover the assets that do (dark favicons, the dark iOS
      // home-screen icon) plus the .ico fallback, which isn't picked up by
      // the svg/png globs below.
      includeAssets: ['favicon.ico', 'favicon-dark.svg', 'apple-touch-icon-dark.png'],
      manifest: {
        name: 'Historical Weather',
        short_name: 'Historical Weather',
        description: 'What the weather has historically been like at a given location.',
        // Light is the default scheme; the manifest can't branch on
        // prefers-color-scheme, so this is what the OS install icon and
        // standalone splash screen use regardless of system theme.
        theme_color: '#f8fafc',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Geocoding results are small and change rarely; archive data is
            // owned by the IndexedDB layer and deliberately not cached here.
            urlPattern: /^https:\/\/geocoding-api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'geocoding',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.js'],
  },
})
