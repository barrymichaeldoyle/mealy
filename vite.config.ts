import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  build: {
    rollupOptions: {
      output: {
        // Keep Clerk in one chunk. Split across two, the SSR chunks import
        // each other, and Clerk's wrapper reads `ClerkProvider` into a
        // module-level `var` while that binding is still undefined. The
        // provider then renders as an undefined element and every server
        // render fails with a 500.
        manualChunks: (id) => (id.includes('@clerk/') ? 'clerk' : undefined),
      },
    },
  },
  plugins: [
    devtools(),
    nitro({
      preset: 'cloudflare_module',
      compatibilityDate: '2026-08-19',
      cloudflare: {
        // Generates wrangler.json at build time, wired to the build output.
        deployConfig: true,
        nodeCompat: true,
        wrangler: {
          name: 'mealy',
          routes: [
            {
              pattern: 'mealy.barrymichaeldoyle.com',
              custom_domain: true,
            },
          ],
          secrets: { required: ['CLERK_SECRET_KEY'] },
          workers_dev: false,
        },
      },
      rollupConfig: { external: [/^@sentry\//] },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    // The React Compiler memoises for us, so components stay free of
    // useMemo and useCallback. `.oxlintrc.json` enforces that.
    babel({ presets: [reactCompilerPreset()] }),
  ],
})

export default config
