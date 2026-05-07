import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/gemini-nano-tester/',
  plugins: [tailwindcss()],
  server: {
    port: 3000,
    host: true
  }
});
