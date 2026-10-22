import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Landing + API route. Output server p/ Pages Functions (endpoint /api/inscricao).
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  site: 'https://links.brunomedeiroseo.com.br',
});
