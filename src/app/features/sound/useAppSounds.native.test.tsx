import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const tapSound = vi.fn((_o?: unknown) => undefined)
let native = true
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native } }))
vi.mock('@muslim/exact-alarms', () => ({ ExactAlarms: { tapSound: (o: unknown) => tapSound(o) } }))

import { useAppSounds } from './useAppSounds'

describe('tap sound on the Android app', () => {
  beforeEach(() => { tapSound.mockClear(); native = true; localStorage.clear() })

  it('plays the click natively and not through Web Audio', () => {
    const { result } = renderHook(() => useAppSounds())
    result.current.tapFeedback('ui')
    result.current.tapFeedback('tasbih')
    expect(tapSound).toHaveBeenNthCalledWith(1, { kind: 'ui' })
    expect(tapSound).toHaveBeenNthCalledWith(2, { kind: 'tasbih' })
  })

  it('does not call the native sound when the sound setting is off', () => {
    localStorage.setItem('azkar_ui_sound_enabled', '0')
    const { result } = renderHook(() => useAppSounds())
    result.current.tapFeedback('ui')
    expect(tapSound).not.toHaveBeenCalled()
  })

  it('uses the browser path on the web', () => {
    native = false
    const { result } = renderHook(() => useAppSounds())
    result.current.tapFeedback('ui')
    expect(tapSound).not.toHaveBeenCalled()
  })
})
