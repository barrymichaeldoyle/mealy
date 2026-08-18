import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
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
  ],
})

export default config
