// `defineConfig` da vitest/config estende quello di Vite e riconosce la sezione `test`.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/bibiciclo/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icona.svg'],
      manifest: {
        name: 'BibiCiclo',
        short_name: 'BibiCiclo',
        description: 'Il tuo ciclo, solo sul tuo telefono.',
        lang: 'it',
        start_url: '/bibiciclo/',
        scope: '/bibiciclo/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fdf7f8',
        theme_color: '#fdf7f8',
        icons: [
          { src: 'icona-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icona-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icona-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
