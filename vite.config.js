import { defineConfig } from 'vite';

// Served from https://hitesh-bhayani.github.io/signals-playground/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/signals-playground/' : '/',
  build: { target: 'es2022' },
});
