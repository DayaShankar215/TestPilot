import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    // The integration suite talks to a real MySQL instance, so files run in
    // sequence rather than competing for the same seeded fixtures.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})