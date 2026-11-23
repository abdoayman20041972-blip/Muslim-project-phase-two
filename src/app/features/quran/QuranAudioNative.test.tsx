import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDownloadedSurahBlob } from './offlineDownload'
import { QuranAudioProvider, useQuranAudio } from './QuranAudioProvider'
const native = vi.hoisted(() => ({ start: vi.fn(async () => {}), stop: vi.fn(async () => {}) }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@muslim/background-audio', () => ({ BackgroundAudio: native }))
vi.mock('./offlineDownload', () => ({ getDownloadedSurahBlob: vi.fn(async () => undefined) }))
class AudioMock extends EventTarget {
  src = ''; currentTime = 0; duration = 20; preload = ''
  play = vi.fn(async () => { this.dispatchEvent(new Event('playing')) })
  pause = vi.fn(() => this.dispatchEvent(new Event('pause')))
  removeAttribute = vi.fn(); load = vi.fn()
}
function Controls() {
  const audio = useQuranAudio()
  return <><button onClick={() => audio.playSingleAyah({ number: 1, numberInSurah: 1, text: '' }, 'ar.minshawi', 1)}>play</button><button onClick={() => audio.playConnected(0, [{ number: 1, numberInSurah: 1, text: '' }], 'ar.minshawi', 1)}>offline</button><button onClick={audio.toggleCurrent}>pause</button><button onClick={audio.stop}>stop</button></>
}
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); vi.stubGlobal('Audio', AudioMock) })
describe('native background integration (mock bridge, not a device)', () => {
  it('uses the same native service for a decoded local recording', async () => {
    vi.mocked(getDownloadedSurahBlob).mockResolvedValueOnce({ size: 20, slice: () => ({ arrayBuffer: async () => new TextEncoder().encode('ID3abcdefghi').buffer }) } as Blob)
    URL.createObjectURL = vi.fn(() => 'blob:local'); URL.revokeObjectURL = vi.fn()
    render(<QuranAudioProvider setView={vi.fn()}><Controls /></QuranAudioProvider>)
    await act(async () => fireEvent.click(screen.getByText('offline')))
    await waitFor(() => expect(native.start).toHaveBeenCalled())
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
  it('starts the existing service for playback and stops on pause/unmount', async () => {
    const { unmount } = render(<QuranAudioProvider setView={vi.fn()}><Controls /></QuranAudioProvider>)
    await act(async () => fireEvent.click(screen.getByText('play')))
    await waitFor(() => expect(native.start).toHaveBeenCalledWith(expect.objectContaining({ artist: 'محمد صديق المنشاوي' })))
    await act(async () => fireEvent.click(screen.getByText('pause')))
    await waitFor(() => expect(native.stop).toHaveBeenCalled())
    const stops = native.stop.mock.calls.length; unmount()
    await waitFor(() => expect(native.stop.mock.calls.length).toBeGreaterThan(stops))
  })
  it('serializes a stop after an in-flight native start', async () => {
    let finish!: () => void
    native.start.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve }))
    render(<QuranAudioProvider setView={vi.fn()}><Controls /></QuranAudioProvider>)
    await act(async () => fireEvent.click(screen.getByText('play')))
    await waitFor(() => expect(native.start).toHaveBeenCalled())
    native.stop.mockClear()
    await act(async () => fireEvent.click(screen.getByText('stop')))
    expect(native.stop).not.toHaveBeenCalled()
    finish()
    await waitFor(() => expect(native.stop).toHaveBeenCalledTimes(1))
  })
})
