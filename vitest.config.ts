import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['convex/lib/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
        },
      },
      {
        // convex-test runs the Convex functions themselves, which need a
        // runtime closer to the real one than plain node.
        test: {
          name: 'convex',
          environment: 'edge-runtime',
          include: ['convex/__tests__/**/*.test.ts'],
          server: { deps: { inline: ['convex-test'] } },
        },
      },
    ],
  },
})
