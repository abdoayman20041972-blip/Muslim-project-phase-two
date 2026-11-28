import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const setKeepScreenOn = vi.fn(async (_: { enabled: boolean }) => {})
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@muslim/background-audio', () => ({ BackgroundAudio: { setKeepScreenOn } }))

import { useKeepAwakeWhileOpen } from './useKeepAwakeWhileOpen'

function Probe() {
  useKeepAwakeWhileOpen()
  return null
}

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve()
  await new Promise((r) => setTimeout(r, 0))
}

beforeEach(() => {
  localStorage.clear()
  setKeepScreenOn.mockClear()
})
afterEach(cleanup)

describe('keep awake while the compass is open (native)', () => {
  it('turns the screen lock on, then restores OFF when the global setting is off', async () => {
    const { unmount } = render(<Probe />)
    await flush()
    unmount()
    await flush()
    expect(setKeepScreenOn.mock.calls.map((c) => c[0].enabled)).toEqual([true, false])
  })
  it('restores ON when the global keep-screen-awake setting is on', async () => {
    localStorage.setItem('azkar_keep_screen_awake', '1')
    const { unmount } = render(<Probe />)
    await flush()
    unmount()
    await flush()
    expect(setKeepScreenOn.mock.calls.map((c) => c[0].enabled)).toEqual([true, true])
  })
  it('lands the restore last even when the screen is left before the acquire ran', async () => {
    const { unmount } = render(<Probe />)
    unmount()
    await flush()
    expect(setKeepScreenOn.mock.calls.map((c) => c[0].enabled)).toEqual([true, false])
  })
})
