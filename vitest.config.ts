import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    // Use 'vmForks' pool which provides better CJS/ESM interoperability
    // and prevents the "Vitest cannot be imported via require()" crash
    pool: 'vmForks',
    poolOptions: {
      vmForks: {
        // Isolate each test file in its own VM context
        memoryLimit: '512MB',
      },
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    server: {
      deps: {
        inline: [
          /ioredis/,
          /socket\.io/,
        ],
      },
    },
  },
});
