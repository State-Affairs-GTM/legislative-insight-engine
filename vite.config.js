import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5174, // 5173 is the directory's default; offset so both can run locally
  },
});
