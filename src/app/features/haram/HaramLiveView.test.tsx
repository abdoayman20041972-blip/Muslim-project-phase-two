import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const loads: string[] = []
vi.mock('hls.js', () => {
  class Hls {
    static isSupported() { return true }
    static Events = { ERROR: 'e', MANIFEST_PARSED: 'm' }
    static ErrorTypes = { MEDIA_ERROR: 'media' }
    on() {}
    loadSource(u: string) { loads.push(u) }
    attachMedia() {}
    destroy() {}
  }
  return { default: Hls }
})
import { HaramLiveView } from './HaramLiveView'
afterEach(() => { cleanup(); loads.length = 0 })

describe('HaramLiveView', () => {
  it('loads the first channel and switches channels', async () => {
    render(<HaramLiveView onBack={() => {}} />)
    await waitFor(() => expect(loads).toEqual(['https://win.holol.com/live/quran/playlist.m3u8']))
    fireEvent.click(screen.getByRole('tab', { name: 'قناة السنة النبوية' }))
    await waitFor(() => expect(loads.at(-1)).toBe('https://win.holol.com/live/sunnah/playlist.m3u8'))
  })
  it('clears the loading overlay when video data arrives', async () => {
    const { container } = render(<HaramLiveView onBack={() => {}} />)
    await waitFor(() => expect(loads.length).toBe(1))
    expect(screen.queryByRole('status')).toBeTruthy()
    fireEvent(container.querySelector('video')!, new Event('loadeddata'))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
  })
})
