import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { applyPrayerOffsets, clampOffset, prayerOffsetsKey, readPrayerOffsets } from '../../src/app/features/prayer/prayerTimes'
import { computeTimingsLocally, getTimings, readCachedTimings } from '../../src/app/features/prayer/prayerTimings'
import { scheduleSettingsKey } from '../../src/app/features/notifications/nativeNotifications'
import { PrayerSection } from '../../src/app/features/settings/sections/PrayerSection'
import { APP_SETTINGS_KEYS, writeSetting } from '../../src/app/settings'

const cairo = { lat: 30.0444, lng: 31.2357 }
const base = { Fajr: '04:50', Sunrise: '06:20', Sunset: '16:30', Dhuhr: '11:45', Asr: '14:40', Maghrib: '16:30', Isha: '17:55' }
beforeEach(() => { localStorage.clear() })

describe('manual prayer offsets', () => {
  it('defaults to zero and leaves times unchanged', () => {
    expect(prayerOffsetsKey()).toBe('0,0,0,0,0')
    expect(applyPrayerOffsets(base)).toEqual(base)
  })
  it('shifts only the chosen prayers, never Sunrise/Sunset, and clamps to +-5', () => {
    writeSetting(APP_SETTINGS_KEYS.prayerOffsets, JSON.stringify({ Dhuhr: -1, Isha: 9, Fajr: -99, Asr: 'x' }))
    expect(readPrayerOffsets()).toEqual({ Fajr: -5, Dhuhr: -1, Asr: 0, Maghrib: 0, Isha: 5 })
    const t = applyPrayerOffsets(base)
    expect(t.Dhuhr).toBe('11:44'); expect(t.Isha).toBe('18:00'); expect(t.Fajr).toBe('04:45')
    expect(t.Sunrise).toBe('06:20'); expect(t.Sunset).toBe('16:30'); expect(t.Asr).toBe('14:40')
    expect(clampOffset(7.4)).toBe(5)
  })
  it('wraps across the hour and midnight', () => {
    expect(applyPrayerOffsets({ ...base, Fajr: '04:58', Isha: '23:58' }, { Fajr: 5, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 5 })).toMatchObject({ Fajr: '05:03', Isha: '00:03' })
  })
  it('applies to getTimings and cached reads without touching the raw cache, and the re-arm key changes', async () => {
    const raw = await computeTimingsLocally(cairo, new Date('2026-11-27T12:00:00'), '5', '0')
    expect(raw).toBeTruthy()
    const day = new Date('2026-11-27T12:00:00')
    const t0 = await getTimings(cairo, day, { offline: true })
    const k0 = scheduleSettingsKey()
    writeSetting(APP_SETTINGS_KEYS.prayerOffsets, JSON.stringify({ Dhuhr: -1 }))
    const t1 = await getTimings(cairo, day, { offline: true })
    expect(t0).toBeNull() // nothing cached off-native with offline
    expect(t1).toBeNull()
    expect(readCachedTimings(cairo, day)).toBeNull()
    expect(scheduleSettingsKey()).not.toBe(k0)
    const shifted = applyPrayerOffsets(raw!)
    const [h, m] = raw!.Dhuhr.split(':').map(Number)
    expect(shifted.Dhuhr).toBe(`${String(Math.floor((h * 60 + m - 1) / 60)).padStart(2, '0')}:${String((h * 60 + m - 1) % 60).padStart(2, '0')}`)
  })
  it('applies offsets to cached timings (getTimings + readCachedTimings) and leaves the stored cache raw', async () => {
    const day = new Date('2026-11-27T12:00:00')
    const key = 'azkar_pt_v3_2026-11-27_30.04_31.24_m5_s0'
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value: base }))
    writeSetting(APP_SETTINGS_KEYS.prayerOffsets, JSON.stringify({ Dhuhr: -1, Maghrib: 2 }))
    expect((await getTimings(cairo, day, { offline: true }))).toMatchObject({ Dhuhr: '11:44', Maghrib: '16:32', Fajr: '04:50' })
    expect(readCachedTimings(cairo, day)).toMatchObject({ Dhuhr: '11:44' })
    expect(JSON.parse(localStorage.getItem(key)!).value.Dhuhr).toBe('11:45')
    writeSetting(APP_SETTINGS_KEYS.prayerOffsets, '{}')
    expect((await getTimings(cairo, day, { offline: true }))!.Dhuhr).toBe('11:45')
  })
  it('settings UI steps by 1, stops at +-5 and persists', () => {
    const saved: Array<[string, string]> = []
    render(<PrayerSection calc="5" setCalc={() => {}} asr="0" setAsr={() => {}} timeFormat="24" setTimeFormat={() => {}} save={(k, v) => { saved.push([k, v]); writeSetting(k, v) }} />)
    const plus = screen.getByLabelText('زيادة دقيقة إلى الظهر')
    for (let i = 0; i < 7; i++) fireEvent.click(plus)
    expect(readPrayerOffsets().Dhuhr).toBe(5)
    expect(plus).toBeDisabled()
    fireEvent.click(screen.getByLabelText('إنقاص دقيقة من الفجر'))
    expect(readPrayerOffsets()).toMatchObject({ Fajr: -1, Dhuhr: 5 })
    expect(saved.length).toBe(6)
  })
})

import { reshiftCarriedEntry } from '../../src/app/features/notifications/nativeNotifications'
import { makeId, KIND } from '../../src/app/features/notifications/notificationPlan'
describe('carried prayer plan (location unavailable)', () => {
  const zero = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 }
  const at = new Date('2026-11-28T11:45:00').getTime()
  const entry = (slot: number) => ({ id: makeId(KIND.at, 1, slot), at, title: 'الظهر', body: 'حي على الصلاة · موعد الأذان ١١:٤٥', channel: 'adhan', target: 'prayer' })
  it('moves the alarm and its shown time by the offset change of that prayer only', () => {
    const moved = reshiftCarriedEntry(entry(1), zero, { ...zero, Dhuhr: -1 })
    expect(moved.at.getTime()).toBe(at - 60_000)
    expect(moved.body).toContain('١١:٤٤'); expect(moved.body).not.toContain('١١:٤٥')
    expect(reshiftCarriedEntry(entry(2), zero, { ...zero, Dhuhr: -1 }).at.getTime()).toBe(at)
  })
  it('keeps an already-shifted cached alarm when the offset did not change since caching', () => {
    expect(reshiftCarriedEntry(entry(1), { ...zero, Dhuhr: 3 }, { ...zero, Dhuhr: 3 }).at.getTime()).toBe(at)
    expect(reshiftCarriedEntry(entry(1), { ...zero, Dhuhr: 3 }, { ...zero, Dhuhr: 1 }).at.getTime()).toBe(at - 120_000)
  })
})
