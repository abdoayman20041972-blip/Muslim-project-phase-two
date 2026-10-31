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
//   - styles.xml: Android 12+ splash attributes (best effort, warns instead of failing)
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
  if (block.includes('windowSplashScreenBackground')) return
  if (!/parent="Theme\.SplashScreen"/.test(block)) {
    warnings.push('AppTheme.NoActionBarLaunch does not extend Theme.SplashScreen; splash theme not patched')
    return
  }
  // The Android 12+ system splash shows the app icon on this background: with
  // the same green and an icon background tint, the OS splash, the Capacitor
  // splash and the in-app splash read as ONE continuous splash screen.
  const items = [
    `        <item name="windowSplashScreenBackground">@color/${SPLASH_COLOR_NAME}</item>\n`,
    `        <item name="windowSplashScreenIconBackgroundColor">@color/${SPLASH_COLOR_NAME}</item>\n`,
  ]
  if (/<style\s+name="AppTheme\.NoActionBar"/.test(xml) && !block.includes('postSplashScreenTheme')) {
    items.push(`        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>\n`)
  }
  const patched = block.replace('</style>', `${items.join('')}    </style>`)
  write(STYLES, xml.replace(block, patched), 'styles.xml (splash theme)')
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
patchNotificationIcons()

console.log(changed.length ? `patch-android: ${changed.join(', ')}` : 'patch-android: already up to date')
for (const warning of warnings) console.warn(`::warning::patch-android: ${warning}`)
