// IMPORTANT (Macaly agent): Do not change or remove anything in this file unless you 100% understand it.
// This config wires up Macaly-specific behavior (Visual Edits tagger, allowed hosts, dev build, prerender).
// Modifying it without full understanding can break Macaly app functionality for the user.
//
// APK build path (GitHub Actions): PRERENDER=1 npm run build — a clean PRODUCTION build
// (minified CSS/JS, no Macaly tagger) with prerendering enabled so Capacitor gets a
// static index.html from .output/public. DEV_BUILD stays untouched for Macaly preview only.

import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import errorOverlay from "@visulima/vite-overlay"
import { macalyTagger } from '@macaly/static-tagger'

const config = defineConfig({
  server: {
    allowedHosts: ['.macaly.dev', '.macaly.app', '.macaly-app.com', '.macaly-user-data.dev', '.e2b.app', '.e2b-juliett.dev'],
  },
  resolve: {
    tsconfigPaths: true,
  },
  ...(process.env.DEV_BUILD && {
    build: {
      target: 'esnext',
      minify: false,
      cssMinify: false,
      sourcemap: false,
      reportCompressedSize: false,
      modulePreload: {
        polyfill: false,
      },
    },
  }),
  plugins: [
    devtools({ injectSource: { enabled: false } }),
    // Macaly Tagger is crucial for proper functionality of Visual Edits in Macaly
    !!process.env.DEV_BUILD && macalyTagger({
      ignorePackages: [
        '@react-three/fiber',
        '@react-three/drei',
        '@react-three/postprocessing',
      ],
    }),
    errorOverlay({
      forwardConsole: true,
      forwardedConsoleMethods: ["error", "warn"],
    }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        // Keep prerender enabled for DEV_BUILD (preview) otherwise preview will not work!
        // PRERENDER=1 enables it for the optimized APK production build as well.
        enabled: !!process.env.DEV_BUILD || !!process.env.PRERENDER,
        autoSubfolderIndex: true,
        autoStaticPathsDiscovery: true,
        crawlLinks: false,
        failOnError: true,
      },
    }),
    // IMPORTANT: Do not remove nitro() — required for production build. Do NOT create nitro.config.ts; it breaks both production and preview builds.
    nitro(),
    viteReact(),
  ],
})

export default config
