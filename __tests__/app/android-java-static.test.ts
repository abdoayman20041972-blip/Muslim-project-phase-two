import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const dir = resolve(__dirname, '../../plugins/capacitor-exact-alarms/android/src/main/java/com/muslim/exactalarms')
const adhan = readFileSync(resolve(dir, 'AdhanService.java'), 'utf8')
const scheduler = readFileSync(resolve(dir, 'AlarmScheduler.java'), 'utf8')

// The Java is compiled only by the CI build; these are source-level checks that the intended
// calls are present and ordered, not a behaviour test.
describe('AdhanService (source checks, compiled only in CI)', () => {
  it('asks for transient audio focus before playing and abandons it when playback is released', () => {
    expect(adhan).toContain('AUDIOFOCUS_GAIN_TRANSIENT')
    expect(adhan).not.toContain('AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK')
    expect(adhan.indexOf('requestFocus();')).toBeGreaterThan(-1)
    expect(adhan.indexOf('requestFocus();')).toBeLessThan(adhan.indexOf('created.start();'))
    const release = adhan.slice(adhan.indexOf('private void releasePlayer()'))
    expect(release.slice(0, 120)).toContain('abandonFocus();')
    expect(adhan).toContain('abandonAudioFocusRequest')
    expect(adhan).toContain('abandonAudioFocus(focusListener)')
  })

  it('ends playback when another app or a call takes the focus', () => {
    expect(adhan).toMatch(/AUDIOFOCUS_LOSS \|\| change == AudioManager\.AUDIOFOCUS_LOSS_TRANSIENT[\s\S]*finishPlayback\(\)/)
  })

  it('posts a fallback notification when startForeground is refused instead of stopping silently', () => {
    const catchBlock = adhan.slice(adhan.indexOf('} catch (RuntimeException refused) {'), adhan.indexOf('acquireWakeLock();'))
    expect(catchBlock).toContain('postFallbackNotification(')
    expect(catchBlock.indexOf('postFallbackNotification(')).toBeLessThan(catchBlock.indexOf('stopSelf();'))
    expect(adhan).toContain('manager.notify(id == 0 ? 7001 : id, builder.build())')
    expect(adhan).toContain('putExtra("channel", entry.channelId)')
  })

  it('keeps the existing audio usage (silent and do-not-disturb behaviour unchanged)', () => {
    expect(adhan).toContain('AudioAttributes.USAGE_NOTIFICATION')
    expect(adhan).not.toContain('USAGE_ALARM')
  })
})

describe('AlarmScheduler (source checks, compiled only in CI)', () => {
  it('uses an immutable PendingIntent for the fire broadcast and never a mutable one', () => {
    const pb = scheduler.slice(scheduler.indexOf('private static PendingIntent pendingBroadcast'), scheduler.indexOf('private static void cancelLegacy'))
    expect(pb).toContain('FLAG_IMMUTABLE')
    expect(pb).not.toContain('FLAG_MUTABLE')
  })

  it('cancels the legacy mutable alarm before arming or cancelling, so an upgrade leaves no duplicates', () => {
    const legacy = scheduler.slice(scheduler.indexOf('private static void cancelLegacy'))
    expect(legacy).toContain('FLAG_NO_CREATE')
    expect(legacy).toContain('FLAG_MUTABLE')
    expect(scheduler.indexOf('cancelLegacy(context, alarmManager, entry.id)')).toBeLessThan(scheduler.indexOf('PendingIntent pending = pendingBroadcast(context, entry.id, intent)'))
    expect(scheduler).toContain('cancelLegacy(context, alarmManager, id)')
  })
})
