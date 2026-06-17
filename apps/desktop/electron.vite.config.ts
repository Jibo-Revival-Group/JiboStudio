import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@jibo-studio/ui-shell': resolve(__dirname, '../../packages/ui-shell/src/index.ts'),
        '@jibo-studio/skill-model': resolve(__dirname, '../../packages/skill-model/src/index.ts'),
        '@jibo-studio/editor-flow': resolve(__dirname, '../../packages/editor-flow/src/index.tsx'),
        '@jibo-studio/editor-behavior': resolve(__dirname, '../../packages/editor-behavior/src/index.tsx'),
        '@jibo-studio/editor-mim': resolve(__dirname, '../../packages/editor-mim/src/index.tsx'),
        '@jibo-studio/editor-rules': resolve(__dirname, '../../packages/editor-rules/src/index.tsx'),
        '@jibo-studio/jibo-api-docs': resolve(__dirname, '../../packages/jibo-api-docs/src/index.ts'),
      },
    },
    plugins: [react()],
  },
});
