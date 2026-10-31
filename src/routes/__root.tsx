import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

// APK-only document shell: no Macaly web bridge, no PWA manifest, no service
// worker — every asset the first paint needs is bundled inside the APK and
// preloaded here so the app opens on its brand green with zero network.

// CSS imported as a side effect — do NOT add `?url` or `?inline`.
//
// Why: TanStack Start runs two Vite build environments (client + ssr) with
// independent module graphs. A `?url` import resolves the CSS URL twice and
// the two passes can produce different hashes; the SSR pass bakes its hash
// into the prerendered HTML, but only the client's asset actually exists in
// `dist/client/assets/`, so the stylesheet 404s and the page loads unstyled.
//
// A bare side-effect import sidesteps the issue: only the client environment
// emits the CSS asset, and TanStack Start's manifest collection injects the
// correct hashed `<link rel="stylesheet">` into the rendered head from the
// client manifest. The CSS stays a shared, cacheable asset.
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'مسلم' },
      { name: 'description', content: 'رفيقك اليومي للعبادة: قرآن وأذكار ومواقيت صلاة وسبحة وقصص الأنبياء.' },
      { name: 'theme-color', content: '#0d2b23' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      // Bundled locally inside the APK: preloading them shaves the first
      // paint of the splash and the home hero off the startup path.
      { rel: 'preload', as: 'image', href: '/img/muslim-splash-mosque.jpg', fetchPriority: 'high' },
      { rel: 'preload', as: 'image', href: '/img/home-mosque-hero.jpg' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {/* APK first paint: transparent so the native launch window (mosque
            splash drawable behind the booting WebView) stays visible until the
            stylesheet paints the designed in-app splash — the "empty green"
            frame between them is gone. The stylesheet is render-blocking and
            sets the real html/body background, so web previews are unaffected. */}
        <style dangerouslySetInnerHTML={{ __html: 'html,body{background:transparent}' }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
