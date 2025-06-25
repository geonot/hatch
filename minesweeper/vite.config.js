import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      'hatch-engine': fileURLToPath(new URL('../engine', import.meta.url))
    }
  },
  server: {
    host: 'localhost',
    port: 3000,
    open: false
  }
});
