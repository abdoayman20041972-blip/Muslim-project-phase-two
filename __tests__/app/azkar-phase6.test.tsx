import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CategoryView } from '../../src/app/features/azkar/CategoryView'
import { SettingsView } from '../../src/app/features/settings/SettingsView'
import { ConfirmDialogProvider } from '../../src/app/components/confirm-dialog'
import { AZKAR_PROGRESS_KEY, todayKey, wirdForPrayerTimes } from '../../src/app/features/azkar/azkarProgress'
import { clearAllJourneyPositions, readJourneyPosition, saveJourneyPosition } from '../../src/app/features/azkar/journeyPosition'
import { favoriteKey } from '../../src/app/features/azkar/useFavorites'
import type { ZikrCategory } from '../../src/azkar-data'

vi.mock('../../src/app/features/quran/useQuranPreferences', () => ({
  useQuranPreferences: () => ({
    fontSize: 'md',
    setFontSize: vi.fn(),
    reciter: 'ar.minshawi',
    setReciter: vi.fn(),
    layout: 'scroll',
    setLayout: vi.fn(),
    fontConfig: { size: '1rem', lineHeight: 2 },
  }),
}))

vi.mock('../../src/app/features/notifications/notificationPermission', () => ({
  getNotificationPermission: () => 'default',
  requestNotificationPermission: vi.fn(async () => 'granted'),
}))

const POSITION_KEY = 'azkar_journey_position'
const at = (hour: number, minute = 0) => new Date(2026, 10, 24, hour, minute)
const timings = { Fajr: '05:00', Sunrise: '06:24', Dhuhr: '11:38', Asr: '14:39', Maghrib: '16:58', Isha: '18:16' }

beforeEach(() => localStorage.clear())

describe('wirdForPrayerTimes', () => {
  it('anchors the wird windows to Fajr, Asr and Isha', () => {
    expect(wirdForPrayerTimes(timings, at(4, 30)).id).toBe('sleep')
    expect(wirdForPrayerTimes(timings, at(5, 0)).id).toBe('morning')
    expect(wirdForPrayerTimes(timings, at(11, 0)).id).toBe('morning')
    expect(wirdForPrayerTimes(timings, at(14, 39)).id).toBe('evening')
    expect(wirdForPrayerTimes(timings, at(18, 0)).id).toBe('evening')
    expect(wirdForPrayerTimes(timings, at(18, 16)).id).toBe('sleep')
    expect(wirdForPrayerTimes(timings, at(23, 30)).id).toBe('sleep')
  })

  it('keeps the existing titles and subtitles', () => {
    expect(wirdForPrayerTimes(timings, at(9)).subtitle).toBe('ورد الصباح الآن')
    expect(wirdForPrayerTimes(timings, at(16)).subtitle).toBe('ورد المساء الآن')
    expect(wirdForPrayerTimes(timings, at(22)).subtitle).toBe('ورد النوم الآن')
  })

  it('follows the computed times instead of the fixed-hour fallback', () => {
    // 14:30 is evening by fixed hours (15-21) but still morning before Asr 14:39.
    expect(wirdForPrayerTimes(timings, at(14, 30)).id).toBe('morning')
    // 18:30 is evening by fixed hours but already sleep after Isha 18:16.
    expect(wirdForPrayerTimes(timings, at(18, 30)).id).toBe('sleep')
  })

  it('falls back to fixed hours when timings are missing or malformed', () => {
    expect(wirdForPrayerTimes(null, at(10)).id).toBe('morning')
    expect(wirdForPrayerTimes(undefined, at(22)).id).toBe('sleep')
    expect(wirdForPrayerTimes({ Fajr: 'غير صالح' }, at(10)).id).toBe('morning')
    expect(wirdForPrayerTimes({ Fajr: '05:00' }, at(16)).id).toBe('evening')
  })
})

describe('journey position day rollover', () => {
  it('reads a position saved today', () => {
    saveJourneyPosition('morning', 3)
    expect(readJourneyPosition('morning')).toBe(3)
  })

  it('resets a position saved on a previous day', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    saveJourneyPosition('morning', 3, yesterday)
    expect(readJourneyPosition('morning')).toBeNull()
  })

  it('keeps a legacy bare position once and re-stamps it with today', () => {
    localStorage.setItem(POSITION_KEY, JSON.stringify({ morning: 2 }))
    expect(readJourneyPosition('morning')).toBe(2)
    const stored = JSON.parse(localStorage.getItem(POSITION_KEY)!)
    expect(stored.morning).toEqual({ day: todayKey(), index: 2 })
  })

  it('clearAllJourneyPositions empties every saved position', () => {
    saveJourneyPosition('morning', 1)
    saveJourneyPosition('evening', 2)
    clearAllJourneyPositions()
    expect(readJourneyPosition('morning')).toBeNull()
    expect(readJourneyPosition('evening')).toBeNull()
  })
})

const category: ZikrCategory = { id: 'ph6-test', label: 'قسم المرحلة', subtitle: 'اختبار', icon: 'spark', items: [{ text: 'ذكر أول', repeat: 2 }, { text: 'ذكر ثان' }] }

describe('progress clear resets the journey position', () => {
  it('clears the category position when its daily progress is cleared', async () => {
    saveJourneyPosition(category.id, 1)
    saveJourneyPosition('other-section', 2)
    render(<ConfirmDialogProvider><CategoryView category={category} favorites={[]} onToggleFavorite={vi.fn()} onBack={vi.fn()} /></ConfirmDialogProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'مسح تقدم اليوم' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }))
    await waitFor(() => expect(readJourneyPosition(category.id)).toBeNull())
    expect(readJourneyPosition('other-section')).toBe(2)
  })

  it('clears every position when all of today progress is cleared from settings', async () => {
    const key = favoriteKey(category, category.items[0])
    localStorage.setItem(AZKAR_PROGRESS_KEY, JSON.stringify({ version: 2, days: { [todayKey()]: { [key]: 1 } } }))
    saveJourneyPosition('morning', 1)
    saveJourneyPosition('evening', 2)
    render(<ConfirmDialogProvider><SettingsView darkMode={false} appearance="light" onAppearance={vi.fn()} onBack={vi.fn()} /></ConfirmDialogProvider>)
    fireEvent.click(screen.getByText('الأذكار', { selector: 'b' }).closest('button')!)
    fireEvent.click(screen.getByRole('button', { name: /التقدم والبيانات/ }))
    fireEvent.click(screen.getByRole('button', { name: 'مسح تقدم اليوم' }))
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('تم مسح تقدم اليوم.')
    expect(readJourneyPosition('morning')).toBeNull()
    expect(readJourneyPosition('evening')).toBeNull()
  })
})
