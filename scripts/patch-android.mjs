#!/usr/bin/env node
// Patches the Capacitor-generated android/ project (created in CI by
// `npx cap add android`, never committed). Idempotent: running it twice
// changes nothing the second time.
//   - AndroidManifest.xml: permissions the notification features need (fails the build if it cannot)
//   - colors.xml: splash background colour
//   - styles.xml: Android 12+ splash attributes (best effort, warns instead of failing)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const ROOT = process.env.ANDROID_PROJECT_DIR || 'android'
const MAIN = join(ROOT, 'app', 'src', 'main')
const MANIFEST = join(MAIN, 'AndroidManifest.xml')
const COLORS = join(MAIN, 'res', 'values', 'colors.xml')
const STYLES = join(MAIN, 'res', 'values', 'styles.xml')
const SPLASH_COLOR_NAME = 'muslim_splash_background'
const SPLASH_COLOR = '#0d2b23'

export const REQUIRED_PERMISSIONS = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.VIBRATE',
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
  const items = [`        <item name="windowSplashScreenBackground">@color/${SPLASH_COLOR_NAME}</item>\n`]
  if (/<style\s+name="AppTheme\.NoActionBar"/.test(xml) && !block.includes('postSplashScreenTheme')) {
    items.push('        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>\n')
  }
  const patched = block.replace('</style>', `${items.join('')}    </style>`)
  write(STYLES, xml.replace(block, patched), 'styles.xml (splash theme)')
}

patchManifest()
patchColors()
patchStyles()

console.log(changed.length ? `patch-android: ${changed.join(', ')}` : 'patch-android: already up to date')
for (const warning of warnings) console.warn(`::warning::patch-android: ${warning}`)
