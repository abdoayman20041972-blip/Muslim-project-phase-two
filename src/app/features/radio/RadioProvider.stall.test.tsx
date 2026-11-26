import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'
import { RadioProvider, useRadio } from './RadioProvider'
import type { RadioStation } from './radioData'

vi.mock('../quran/QuranAudioProvider', () => ({
  useQuranAudio: () => ({ stop: vi.fn(), currentSurah: null }),
}))

class FakeAudio {
  static instances: FakeAudio[] = []
  listeners: Record<string, Array<(e: Event) => void>> = {}
  paused = true
  src = ''
  constructor() { FakeAudio.instances.push(this) }
  addEventListener(name: string, fn: (e: Event) => void) { (this.listeners[name] ??= []).push(fn) }
  removeEventListener(name: string, fn: (e: Event) => void) {
    this.listeners[name] = (this.listeners[name] ?? []).filter((f) => f !== fn)
  }
  dispatchEvent(event: Event) { (this.listeners[event.type] ?? []).forEach((f) => f(event)); return true }
  play() { this.paused = false; return Promise.resolve() }
  pause() { this.paused = true }
  load() {}
  removeAttribute() {}
  emit(name: string) { this.dispatchEvent(new Event(name)) }
}

const station: RadioStation = { id: 108, name: 'العامة', url: 'https://backup.qurango.net/radio/mix' }

function Probe() {
  const radio = useRadio()
  useEffect(() => { radio.play(station) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return <output data-testid="status">{radio.status}</output>
}

describe('radio stall watchdog', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakeAudio.instances = []
    vi.stubGlobal('Audio', FakeAudio)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('a stream that never plays errors after one automatic retry instead of loading forever', async () => {
    render(<RadioProvider><Probe /></RadioProvider>)
    expect(screen.getByTestId('status').textContent).toBe('loading')
    // First 20s stall: watchdog routes through the error path, which retries once.
    await act(async () => { await vi.advanceTimersByTimeAsync(20_600) })
    expect(screen.getByTestId('status').textContent).toBe('loading')
    // Retry attempt also stalls: now the error state must show.
    await act(async () => { await vi.advanceTimersByTimeAsync(1_600 + 20_600) })
    expect(screen.getByTestId('status').textContent).toBe('error')
  })

  it('a mid-play stall (waiting with no progress) is caught the same way', async () => {
    render(<RadioProvider><Probe /></RadioProvider>)
    // Play starts fine.
    const el = FakeAudio.instances[0]
    await act(async () => { el.emit('playing') })
    expect(screen.getByTestId('status').textContent).toBe('playing')
    // Buffering starts and never recovers (no timeupdate progress).
    await act(async () => { el.emit('waiting') })
    expect(screen.getByTestId('status').textContent).toBe('loading')
    await act(async () => { await vi.advanceTimersByTimeAsync(20_600 + 1_600 + 20_600) })
    expect(screen.getByTestId('status').textContent).toBe('error')
  })
})
