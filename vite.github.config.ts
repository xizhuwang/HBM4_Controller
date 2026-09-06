import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';
import { licenseNotices } from './scripts/license-notices';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/HBM4_Controller/',
  plugins: [react(), licenseNotices()],
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: { alias: { '@': root } },
  build: { outDir: 'gh-pages', emptyOutDir: true },
});
