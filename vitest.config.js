import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js', 'benchmarks/**/*.bench.js'],
    exclude: ['node_modules/**', 'dist/**', 'build-*/**'],
    testTimeout: 30000, // 30 seconds for WASM loading
    hookTimeout: 60000, // 60 seconds for setup
    pool: 'forks', // Use forks for better isolation
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results.json'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'build-*/**',
        'tests/**',
        'benchmarks/**',
        '*.config.*'
      ]
    },
    benchmark: {
      include: ['benchmarks/**/*.bench.js'],
      exclude: ['node_modules/**', 'dist/**'],
      reporters: ['verbose'],
      outputFile: './benchmark-results.json'
    }
  }
});