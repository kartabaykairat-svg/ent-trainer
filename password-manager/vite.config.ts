import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Строгая Content-Security-Policy только для production-сборки
// (dev-сервер Vite использует inline-скрипты для hot reload).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://icons.duckduckgo.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.pwnedpasswords.com",
  "font-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'pm-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<!--CSP-->',
        `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

// Генерирует sw.js со списком всех файлов сборки для офлайн-работы.
function serviceWorkerPlugin(): Plugin {
  return {
    name: 'pm-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const extra = ['index.html', 'config.js', 'theme-init.js', 'icon.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest'];
      const list = ['./', ...[...new Set([...extra, ...files])].map((f) => `./${f}`)];
      const version = createHash('sha256').update(files.sort().join('|')).digest('hex').slice(0, 12);
      const source = readFileSync(new URL('./sw-template.js', import.meta.url), 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(list, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), cspPlugin(), serviceWorkerPlugin()],
  build: {
    outDir: '../passwords',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 800,
  },
});
