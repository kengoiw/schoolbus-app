import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node', // UIコンポーネント用にはあとで jsdom/happy-dom などが必要に応じ追加
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
