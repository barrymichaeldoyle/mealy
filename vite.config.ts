import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro({
      preset: 'cloudflare_module',
      // Required at 2024-09-19 or later for Workers with static assets.
      compatibilityDate: '2024-09-19',
      cloudflare: {
        // Generates wrangler.json at build time, wired to the build output.
        deployConfig: true,
        nodeCompat: true,
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
