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
    // Mirrors the Capacitor android template exactly (npx cap add android):
    // AppTheme.NoActionBar ships windowActionBar/windowNoTitle + a @null
    // background, and the launch theme uses androidx Theme.SplashScreen.
    '<resources>\n    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar"></style>\n    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">\n        <item name="windowActionBar">false</item>\n        <item name="windowNoTitle">true</item>\n        <item name="android:background">@null</item>\n    </style>\n    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">\n        <item name="android:background">@drawable/splash</item>\n    </style>\n</resources>\n',
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
    // The window background is the layer-list: mosque icon on brand green
    // while the WebView boots, so no flat "empty green" stage can appear
    // between the system splash and the prerendered in-app splash.
    expect(block).toContain('<item name="android:windowBackground">@drawable/muslim_splash_window</item>')
    // android:background is the SAME layer-list, not a flat color: OEM
    // starting windows that draw this attribute during the pre-window launch
    // stage show the mosque emblem instead of an empty green screen.
    expect(block).toContain('<item name="android:background">@drawable/muslim_splash_window</item>')
    expect(block).toContain('<item name="android:windowSplashScreenBackground">@color/muslim_splash_background</item>')
    expect(block).toContain('<item name="android:windowSplashScreenIconBackgroundColor">@color/muslim_splash_background</item>')
    // The Android 12+ system splash icon is set explicitly so the mosque
    // launcher icon always shows on the brand green.
    expect(block).toContain('<item name="android:windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item>')
    expect(block).not.toMatch(/android:windowBackground[^<]*@drawable\/splash\b/)
  })

  it('patches AppTheme.NoActionBar — the theme Capacitor switches to before setContentView (root fix for the gray web-boot stage)', () => {
    const { root, main } = fixture()
    run(root)
    const styles = readFileSync(join(main, 'res', 'values', 'styles.xml'), 'utf8')
    const block = /<style\s+name="AppTheme\.NoActionBar"[^>]*>[\s\S]*?<\/style>/.exec(styles)![0]
    // Capacitor's BridgeActivity.onCreate() calls setTheme(AppTheme_NoActionBar)
    // BEFORE setContentView(), so the DecorView resolves its window background
    // from THIS theme. Left at the template default it is Material DayNight's
    // #303030 dark gray, which shone through the transparent WebView for the
    // whole WebView boot — the gray "web trace" in the user's recording.
    // The layer-list here makes the visible window paint mosque-on-green from
    // its very first frame.
    expect(block).toContain('<item name="android:windowBackground">@drawable/muslim_splash_window</item>')
    expect(block).toContain('<item name="android:background">@drawable/muslim_splash_window</item>')
    expect(block).not.toContain('@null')
    // The AppCompat items and the DayNight parent are preserved so Capacitor's
    // own theme resolution keeps working.
    expect(block).toContain('<item name="windowActionBar">false</item>')
    expect(block).toContain('<item name="windowNoTitle">true</item>')
    expect(block).toContain('parent="Theme.AppCompat.DayNight.NoActionBar"')
  })

  it('writes the splash window layer-list (green + centered icon, never stretched)', () => {
    const { root, main } = fixture()
    run(root)
    const drawable = readFileSync(join(main, 'res', 'drawable', 'muslim_splash_window.xml'), 'utf8')
    expect(drawable).toContain('<layer-list')
    // Color layer first, bitmap second — the color guarantees full coverage
    // even if the bitmap is clipped.
    expect(drawable.indexOf('@color/muslim_splash_background')).toBeLessThan(drawable.indexOf('@drawable/splash'))
    // gravity=center WITHOUT width/height → intrinsic density-scaled size,
    // so the mosque icon never stretches to the window bounds.
    expect(drawable).toContain('android:gravity="center"')
    expect(drawable).not.toContain('android:width')
    expect(drawable).not.toContain('android:height')
  })

  it('is idempotent', () => {
    const { root, main } = fixture()
    run(root)
    const first = readFileSync(join(main, 'AndroidManifest.xml'), 'utf8')
    expect(run(root)).toContain('already up to date')
    expect(readFileSync(join(main, 'AndroidManifest.xml'), 'utf8')).toBe(first)
  })

  it('keeps the notification icons next to the splash window drawable', () => {
    const { root, main } = fixture()
    // The binary icons are committed with the repo; copy them so the patch
    // script can install them in the fixture project too.
    mkdirSync(join(root, 'native'), { recursive: true })
    writeFileSync(join(root, 'native', 'stat-icon.png'), readFileSync(resolve(__dirname, '../../native/stat-icon.png')))
    writeFileSync(join(root, 'native', 'large-icon.png'), readFileSync(resolve(__dirname, '../../native/large-icon.png')))
    run(root)
    expect(existsSyncFn(join(main, 'res', 'drawable', 'muslim_stat_icon.png'))).toBe(true)
    expect(existsSyncFn(join(main, 'res', 'drawable', 'muslim_large_icon.png'))).toBe(true)
  })
})

const existsSyncFn = (path: string) => {
  try {
    readFileSync(path)
    return true
  } catch {
    return false
  }
}
