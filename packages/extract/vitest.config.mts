import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { name: 'extract', environment: 'jsdom', include: ['test/**/*.test.ts'] },
});
