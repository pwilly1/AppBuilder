import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      '@blocks-native': path.resolve(__dirname, 'src/shared/blocks-native'),
    },
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.jsx', '.js'],
  },
  server: {
    proxy: {
      // forward /auth/* requests to the backend during development
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
        '/projects': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
    },
  },
}));

