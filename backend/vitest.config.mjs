import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',

      include: [
        '**/*.js',
      ],

      exclude: [
        '**/*.test.js',
        '**/*.spec.js',
        'node_modules/**',
        'coverage/**',
      ],
    },
  },
})
