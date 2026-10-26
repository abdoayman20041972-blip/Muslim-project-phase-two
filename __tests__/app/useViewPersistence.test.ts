import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useViewPersistence } from '../../src/app/features/quran/useViewPersistence'
import type { View } from '../../src/app/constants'

describe('useViewPersistence', () => {
  beforeEach(() => localStorage.clear())

  it('writes azkar_last_view when navigating to tasbih', () => {
    const { rerender } = renderHook(({ view }) => useViewPersistence(view, vi.fn()), {
      initialProps: { view: { name: 'tasbih' } as View },
    })

    expect(localStorage.getItem('azkar_last_view')).toBe('tasbih')

    rerender({ view: { name: 'tasbih' } as View })
  })

  it('does not overwrite azkar_last_view when navigating home', () => {
    const { rerender } = renderHook(({ view }) => useViewPersistence(view, vi.fn()), {
      initialProps: { view: { name: 'tasbih' } as View },
    })

    expect(localStorage.getItem('azkar_last_view')).toBe('tasbih')

    rerender({ view: { name: 'home' } as View })

    expect(localStorage.getItem('azkar_last_view')).toBe('tasbih')
  })

  it('writes azkar_last_view when navigating to prayer-times', () => {
    renderHook(() => useViewPersistence({ name: 'prayer-times' }, vi.fn()))

    expect(localStorage.getItem('azkar_last_view')).toBe('prayer-times')
  })

  it('writes only azkar_last_surah for mushaf-surah and does not touch azkar_last_view', () => {
    localStorage.setItem('azkar_last_view', 'tasbih')
    const setLastSurah = vi.fn()
    const view: View = { name: 'mushaf-surah', number: 2 }

    renderHook(() => useViewPersistence(view, setLastSurah))

    expect(localStorage.getItem('azkar_last_surah')).toBe('2')
    expect(localStorage.getItem('azkar_last_view')).toBe('tasbih')
    expect(setLastSurah).toHaveBeenCalledWith(2)
  })
})
