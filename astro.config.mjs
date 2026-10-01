import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://missinglinkmusic.net',
  // emit join-ml.html instead of join-ml/index.html so existing URLs keep working
  build: { format: 'file' },
  vite: { plugins: [tailwindcss()] },
});
