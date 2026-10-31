#!/usr/bin/env node
// Patches the Capacitor-generated android/ project (created in CI by
// `npx cap add android`, never committed). Idempotent: running it twice
// changes nothing the second time.
//   - AndroidManifest.xml: permissions the notification and location features
//     need (fails the build if it cannot)
//       * USE_EXACT_ALARM (Android 13+) is granted automatically for alarm-style
//         apps, so the adhan fires at the exact minute without any user action.
//       * SCHEDULE_EXACT_ALARM (Android 12) needs a one-time user grant that the
//         app prompts for; without it Android defers alarms in Doze.
//       * ACCESS_COARSE_LOCATION / ACCESS_FINE_LOCATION: the @capacitor/geolocation
//         plugin ships an EMPTY AndroidManifest, so unless the app declares these
//         itself Android silently auto-denies every location request — the real
//         system dialog never appears. With them declared, Geolocation
//         .requestPermissions() shows the genuine OS dialog (approximate-only
//         grant is accepted: it is accurate enough for prayer times).
//   - colors.xml: splash background colour
//   - styles.xml: the single-stage launch theme (best effort, warns instead of failing)
//   - res/drawable/muslim_splash_window.xml: layer-list window background — brand
//     green + the mosque splash bitmap centered WITHOUT stretching. While the
//     WebView boots, the window behind it shows the same mosque icon on the same
//     green as the Android 12+ system splash, so there is no "empty green" stage
//     between the system splash and the prerendered in-app splash.
//   - res/drawable: the white status-bar icon and gold notification icon used by
//     every scheduled notification (instead of the squished launcher icon)
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const ROOT = process.env.ANDROID_PROJECT_DIR || 'android'
const MAIN = join(ROOT, 'app', 'src', 'main')
const MANIFEST = join(MAIN, 'AndroidManifest.xml')
const COLORS = join(MAIN, 'res', 'values', 'colors.xml')
const STYLES = join(MAIN, 'res', 'values', 'styles.xml')
const DRAWABLES = join(MAIN, 'res', 'drawable')
const SPLASH_COLOR_NAME = 'muslim_splash_background'
const SPLASH_COLOR = '#0d2b23'
const SPLASH_WINDOW_DRAWABLE = 'muslim_splash_window'

// Binary notification icons committed with the repo (native/ folder).
const NOTIFICATION_ICONS = [
  ['native/stat-icon.png', 'muslim_stat_icon.png'],
  ['native/large-icon.png', 'muslim_large_icon.png'],
]

export const REQUIRED_PERMISSIONS = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.USE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.VIBRATE',
  // Without these two the OS dialog for location NEVER shows (see header):
  // previous builds were denied silently, which is why the phone never truly
  // asked for the permission.
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
]

const changed = []
const warnings = []

function read(path) {
  return readFileSync(path, 'utf8')
}
function write(path, text, label) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
  changed.push(label)
}

function patchManifest() {
  if (!existsSync(MANIFEST)) throw new Error(`Manifest not found at ${MANIFEST}`)
  let xml = read(MANIFEST)
  const missing = REQUIRED_PERMISSIONS.filter(
    (name) => !new RegExp(`<uses-permission[^>]*android:name="${name.replace(/\./g, '\\.')}"`).test(xml),
  )
  if (!missing.length) return
  const marker = xml.indexOf('<application')
  if (marker < 0) throw new Error('<application> element not found in AndroidManifest.xml')
  const lines = missing.map((name) => `    <uses-permission android:name="${name}" />\n`).join('')
  xml = xml.slice(0, marker) + lines + '\n    ' + xml.slice(marker)
  write(MANIFEST, xml, `manifest (+${missing.length} permissions)`)
}

function patchColors() {
  if (!existsSync(COLORS)) {
    write(COLORS, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="${SPLASH_COLOR_NAME}">${SPLASH_COLOR}</color>\n</resources>\n`, 'colors.xml (created)')
    return
  }
  const xml = read(COLORS)
  if (xml.includes(`name="${SPLASH_COLOR_NAME}"`)) return
  const next = xml.replace('</resources>', `    <color name="${SPLASH_COLOR_NAME}">${SPLASH_COLOR}</color>\n</resources>`)
  if (next === xml) throw new Error('colors.xml has no </resources> element')
  write(COLORS, next, 'colors.xml')
}

function patchStyles() {
  if (!existsSync(STYLES)) {
    warnings.push('styles.xml not found; splash theme not patched')
    return
  }
  const xml = read(STYLES)
  const match = /<style\s+name="AppTheme\.NoActionBarLaunch"[^>]*>[\s\S]*?<\/style>/.exec(xml)
  if (!match) {
    warnings.push('AppTheme.NoActionBarLaunch not found; splash theme not patched')
    return
  }
  const block = match[0]
  if (block.includes('muslim_splash_window')) return
  if (!/<style\s+name="AppTheme\.NoActionBar"/.test(xml)) {
    warnings.push('AppTheme.NoActionBar not found; splash theme not patched')
    return
  }
  // ONE launch theme, one green, every Android version, light AND dark mode:
  //   * parent is AppTheme.NoActionBar — NOT androidx Theme.SplashScreen,
  //     which (without installSplashScreen()) silently falls back to a black
  //     Material background in dark mode and drags in the splash-screen plugin.
  //   * android:windowBackground is a LAYER-LIST (muslim_splash_window.xml):
  //     brand green + the generated @drawable/splash (mosque icon on the same
  //     green, both day and night variants) centered via gravity so the bitmap
  //     never stretches. The window behind the booting WebView therefore keeps
  //     showing the mosque icon on green — the hand-off from the Android 12+
  //     system splash is seamless and users never see an "empty green" stage.
  //     (Referencing @drawable/splash directly as a window background stretches
  //     it; the layer-list with gravity is what makes it safe.)
  //   * android:background stays the flat brand green as a fallback for paths
  //     that read it instead of windowBackground.
  //   * android:windowSplashScreen* (Android 12+ framework attributes) colors
  //     the OS splash screen itself: mosque icon on the same brand green.
  const replacement = [
    '    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">',
    `        <item name="android:windowBackground">@drawable/${SPLASH_WINDOW_DRAWABLE}</item>`,
    `        <item name="android:background">@color/${SPLASH_COLOR_NAME}</item>`,
    `        <item name="android:windowSplashScreenBackground">@color/${SPLASH_COLOR_NAME}</item>`,
    `        <item name="android:windowSplashScreenIconBackgroundColor">@color/${SPLASH_COLOR_NAME}</item>`,
    '    </style>',
  ].join('\n')
  write(STYLES, xml.replace(block, replacement), 'styles.xml (single-stage launch theme)')
}

function patchSplashWindowDrawable() {
  // Layer-list: color layer + the generated splash bitmap centered at its
  // density-scaled intrinsic size (gravity only, no width/height → no stretch,
  // and works on every API level). The -night splash drawables are generated on
  // the same brand green, so light and dark look identical here.
  const target = join(DRAWABLES, `${SPLASH_WINDOW_DRAWABLE}.xml`)
  if (existsSync(target)) return
  mkdirSync(DRAWABLES, { recursive: true })
  write(
    target,
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<layer-list xmlns:android="http://schemas.android.com/apk/res/android">',
      `    <item android:drawable="@color/${SPLASH_COLOR_NAME}" />`,
      '    <item android:drawable="@drawable/splash" android:gravity="center" />',
      '</layer-list>',
      '',
    ].join('\n'),
    `drawable/${SPLASH_WINDOW_DRAWABLE}.xml (window background: icon on green, no stretch)`,
  )
}

function patchNotificationIcons() {
  mkdirSync(DRAWABLES, { recursive: true })
  for (const [source, target] of NOTIFICATION_ICONS) {
    if (!existsSync(source)) {
      warnings.push(`${source} not found; notification icon ${target} not installed (the launcher icon is used instead)`)
      continue
    }
    const destination = join(DRAWABLES, target)
    if (existsSync(destination)) continue
    copyFileSync(source, destination)
    changed.push(`drawable/${target}`)
  }
}

patchManifest()
patchColors()
patchStyles()
patchSplashWindowDrawable()
patchNotificationIcons()

console.log(changed.length ? `patch-android: ${changed.join(', ')}` : 'patch-android: already up to date')
for (const warning of warnings) console.warn(`::warning::patch-android: ${warning}`)
