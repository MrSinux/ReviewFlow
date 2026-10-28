import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Absolute site URL for the Open Graph tags in index.html (empty = relative URLs).
  const appUrl = (env.VITE_PUBLIC_APP_URL ?? '').trim().replace(/\/+$/, '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'inject-app-url',
        transformIndexHtml: (html) => html.replaceAll('__APP_URL__', appUrl),
      },
    ],
  };
});
