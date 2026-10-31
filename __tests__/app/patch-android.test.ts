import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const script = resolve(__dirname, '../../scripts/patch-android.mjs')

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'patch-android-'))
  const main = join(root, 'app', 'src', 'main')
  mkdirSync(join(main, 'res', 'values'), { recursive: true })
  writeFileSync(
    join(main, 'AndroidManifest.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <application android:label="x"></application>\n    <uses-permission android:name="android.permission.INTERNET" />\n</manifest>\n',
  )
  writeFileSync(
    join(main, 'res', 'values', 'styles.xml'),
    '<resources>\n    <style name="AppTheme.NoActionBar" parent="AppTheme"></style>\n    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">\n        <item name="android:background">@drawable/splash</item>\n    </style>\n</resources>\n',
  )
  return { root, main }
}

const run = (root: string) => execFileSync('node', [script], { env: { ...process.env, ANDROID_PROJECT_DIR: root } }).toString()

describe('patch-android.mjs', () => {
  it('adds the notification and location permissions and splash attributes', () => {
    const { root, main } = fixture()
    run(root)
    const manifest = readFileSync(join(main, 'AndroidManifest.xml'), 'utf8')
    // Location permissions are REQUIRED: the @capacitor/geolocation plugin ships
    // an empty manifest, so without these the OS dialog never shows and every
    // request is silently denied.
    for (const name of ['POST_NOTIFICATIONS', 'SCHEDULE_EXACT_ALARM', 'USE_EXACT_ALARM', 'RECEIVE_BOOT_COMPLETED', 'VIBRATE', 'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION']) {
      expect(manifest).toContain(`android.permission.${name}`)
    }
    expect(readFileSync(join(main, 'res', 'values', 'colors.xml'), 'utf8')).toContain('muslim_splash_background')
    expect(readFileSync(join(main, 'res', 'values', 'styles.xml'), 'utf8')).toContain('windowSplashScreenBackground')
    expect(readFileSync(join(main, 'res', 'values', 'styles.xml'), 'utf8')).toContain('windowSplashScreenIconBackgroundColor')
  })

  it('installs the single-stage launch theme (same green in light and dark)', () => {
    const { root, main } = fixture()
    run(root)
    const styles = readFileSync(join(main, 'res', 'values', 'styles.xml'), 'utf8')
    const block = /<style\s+name="AppTheme\.NoActionBarLaunch"[^>]*>[\s\S]*?<\/style>/.exec(styles)![0]
    // The launch theme must NOT depend on androidx Theme.SplashScreen (black
    // fallback in dark mode without installSplashScreen) and must color the
    // Android 12+ system splash itself with the framework attributes.
    expect(block).toContain('parent="AppTheme.NoActionBar"')
    expect(block).not.toContain('Theme.SplashScreen')
    expect(block).toContain('<item name="android:background">@color/muslim_splash_background</item>')
    expect(block).toContain('<item name="android:windowSplashScreenBackground">@color/muslim_splash_background</item>')
    expect(block).toContain('<item name="android:windowSplashScreenIconBackgroundColor">@color/muslim_splash_background</item>')
    expect(block).not.toContain('@drawable/splash')
  })

  it('is idempotent', () => {
    const { root, main } = fixture()
    run(root)
    const first = readFileSync(join(main, 'AndroidManifest.xml'), 'utf8')
    expect(run(root)).toContain('already up to date')
    expect(readFileSync(join(main, 'AndroidManifest.xml'), 'utf8')).toBe(first)
  })
})
