import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DAILY_AYAHS } from '../../src/daily-ayahs'
import { fullTextForDailyAyah, surahNumberForDailyAyah } from '../../src/app/features/home/dailyAyahFull'
import { DailyAyahCard } from '../../src/app/features/home/DailyAyahCard'
import { MoreView } from '../../src/app/features/home/MoreView'

describe('daily ayah full text', () => {
  it('resolves every bundled excerpt to a surah and a complete verse that contains it', async () => {
    const strip = (t: string) => t.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ـ/g, '')
    for (const ayah of DAILY_AYAHS) {
      expect(surahNumberForDailyAyah(ayah), ayah.surah).not.toBeNull()
      const full = await fullTextForDailyAyah(ayah)
      expect(full, `${ayah.surah} ${ayah.number}`).toBeTruthy()
      expect(full!.length).toBeGreaterThanOrEqual(ayah.text.length - 4)
    }
    expect(strip('x')).toBe('x')
  }, 60000)
})

describe('DailyAyahCard', () => {
  const ayah = { text: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', surah: 'الرعد', number: 28 }
  it('expands to the complete verse and has no copy button', async () => {
    const onOpenSurah = vi.fn()
    render(<DailyAyahCard ayah={ayah} onOpenSurah={onOpenSurah} />)
    expect(screen.queryByText(/مقتطف/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'نسخ' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'الآية كاملة' }))
    const full = await screen.findByTestId('daily-ayah-full')
    await waitFor(() => expect(within(full).queryByRole('status')).toBeNull())
    expect(full.textContent!.length).toBeGreaterThan(ayah.text.length)
    fireEvent.click(screen.getByRole('button', { name: 'فتح السورة في المصحف' }))
    expect(onOpenSurah).toHaveBeenCalledWith(13)
  })
  it('tafsir button opens the tafsir panel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ '28': 'نص تفسير تجريبي' }) }))
    render(<DailyAyahCard ayah={ayah} />)
    fireEvent.click(screen.getByRole('button', { name: 'التفسير' }))
    expect(await screen.findByTestId('daily-ayah-tafsir')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('نص تفسير تجريبي')).toBeTruthy())
    vi.unstubAllGlobals()
  })
})

describe('MoreView', () => {
  it('lists Tasbih, Settings and the secondary tools and opens them', () => {
    const onOpen = vi.fn()
    render(<MoreView onOpen={onOpen} />)
    for (const name of ['السبحة', 'الإعدادات', 'المفضلة', 'قصص الأنبياء', 'القبلة']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
    fireEvent.click(screen.getByRole('button', { name: 'الإعدادات' }))
    expect(onOpen).toHaveBeenCalledWith({ name: 'settings' })
    fireEvent.click(screen.getByRole('button', { name: 'السبحة' }))
    expect(onOpen).toHaveBeenCalledWith({ name: 'tasbih' })
  })
})
