import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  __resetQuranPreferencesForTests,
  useQuranPreferences,
} from './useQuranPreferences'
import { APP_SETTINGS_KEYS } from '../../settings'

describe('unified quran preferences store (س18)', () => {
  beforeEach(() => {
    localStorage.clear()
    __resetQuranPreferencesForTests()
  })

  it('shares one state between every hook instance, without a custom event race', () => {
    const first = renderHook(() => useQuranPreferences())
    const second = renderHook(() => useQuranPreferences())
    act(() => first.result.current.setFontSize('lg'))
    expect(second.result.current.fontSize).toBe('lg')
    act(() => second.result.current.setLayout('pages'))
    expect(first.result.current.layout).toBe('pages')
    act(() => first.result.current.setReciter('ar.husary'))
    expect(second.result.current.reciter).toBe('ar.husary')
  })

  it('persists every change to the canonical settings keys', () => {
    const { result } = renderHook(() => useQuranPreferences())
    act(() => result.current.setFontSize('xl'))
    act(() => result.current.setReciter('ar.alafasy'))
    act(() => result.current.setLayout('pages'))
    expect(localStorage.getItem(APP_SETTINGS_KEYS.fontSize)).toBe('xl')
    expect(localStorage.getItem(APP_SETTINGS_KEYS.reciter)).toBe('ar.alafasy')
    expect(localStorage.getItem(APP_SETTINGS_KEYS.readingLayout)).toBe('pages')
  })

  it('reads stored values once and ignores invalid ones', () => {
    localStorage.setItem(APP_SETTINGS_KEYS.fontSize, 'huge')
    localStorage.setItem(APP_SETTINGS_KEYS.reciter, 'ar.unknown')
    localStorage.setItem(APP_SETTINGS_KEYS.readingLayout, 'grid')
    const { result } = renderHook(() => useQuranPreferences())
    expect(result.current.fontSize).toBe('md')
    expect(result.current.reciter).toBe('ar.minshawi')
    expect(result.current.layout).toBe('scroll')
  })

  it('rejects writes of invalid values', () => {
    const { result } = renderHook(() => useQuranPreferences())
    act(() => result.current.setFontSize('huge' as never))
    act(() => result.current.setReciter('ar.unknown'))
    act(() => result.current.setLayout('grid' as never))
    expect(result.current.fontSize).toBe('md')
    expect(result.current.reciter).toBe('ar.minshawi')
    expect(result.current.layout).toBe('scroll')
    expect(localStorage.getItem(APP_SETTINGS_KEYS.fontSize)).toBeNull()
  })
})
