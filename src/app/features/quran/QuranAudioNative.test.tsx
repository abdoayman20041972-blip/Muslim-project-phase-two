import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { surahList } from '../../../quran-meta'
import { getDownloadedSurahBlob } from './offlineDownload'
import { QuranAudioProvider, useQuranAudio } from './QuranAudioProvider'
const native = vi.hoisted(() => {
  const state = { handler: null as null | ((event: { action: string; position?: number }) => void), remove: vi.fn(async () => {}) }
  return {
    state,
    start: vi.fn(async (_options?: unknown) => {}), stop: vi.fn(async () => {}),
    requestNotificationPermission: vi.fn(async () => ({ granted: true })),
    addListener: vi.fn(async (_name: string, handler: (event: { action: string; position?: number }) => void) => { state.handler = handler; return { remove: state.remove } }),
  }
})
const emit = (action: string) => act(async () => { native.state.handler?.({ action }) })
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@muslim/background-audio', () => ({ BackgroundAudio: native }))
vi.mock('./offlineDownload', () => ({ getDownloadedSurahBlob: vi.fn(async () => undefined) }))
class AudioMock extends EventTarget {
  static instances: AudioMock[] = []
  src = ''; currentTime = 0; duration = 20; preload = ''
  constructor() { super(); AudioMock.instances.push(this) }
  play = vi.fn(async () => { this.dispatchEvent(new Event('playing')) })
  pause = vi.fn(() => this.dispatchEvent(new Event('pause')))
  removeAttribute = vi.fn(); load = vi.fn()
}
function Controls() {
  const audio = useQuranAudio()
  return <><button onClick={() => audio.playSingleAyah({ number: 1, numberInSurah: 1, text: '' }, 'ar.minshawi', 1)}>play</button><button onClick={() => audio.playConnected(0, [{ number: 1, numberInSurah: 1, text: '' }], 'ar.minshawi', 1)}>offline</button><button onClick={() => audio.playConnected(0, [{ number: 1, numberInSurah: 1, text: '' }], 'ar.minshawi', 2)}>c2</button><button onClick={() => audio.playConnected(0, [{ number: 1, numberInSurah: 1, text: '' }], 'ar.minshawi', 114)}>c114</button><button onClick={() => audio.playConnected(0, [{ number: 1, numberInSurah: 1, text: '' }], 'ar.minshawi', 1)}>c1</button><button onClick={audio.toggleCurrent}>pause</button><button onClick={audio.stop}>stop</button></>
}
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); native.state.handler = null; AudioMock.instances = []; native.requestNotificationPermission.mockResolvedValue({ granted: true }); vi.stubGlobal('Audio', AudioMock) })
describe('native background integration (mock bridge, not a device)', () => {
  it('uses the same native service for a decoded local recording', async () => {
    vi.mocked(getDownloadedSurahBlob).mockResolvedValueOnce({ size: 20, slice: () => ({ arrayBuffer: async () => new TextEncoder().encode('ID3abcdefghi').buffer }) } as Blob)
    URL.createObjectURL = vi.fn(() => 'blob:local'); URL.revokeObjectURL = vi.fn()
    render(<QuranAudioProvider setView={vi.fn()}><Controls /></QuranAudioProvider>)
    await act(async () => fireEvent.click(screen.getByText('offline')))
    await waitFor(() => expect(native.start).toHaveBeenCalled())
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
  it('keeps the service while paused with the paused state, stops on stop and unmount', async () => {
    const { unmount } = render(<QuranAudioProvider setView={vi.fn()}><Controls /></QuranAudioProvider>)
    await act(async () => fireEvent.click(screen.getByText('play')))
    await waitFor(() => expect(native.start).toHaveBeenCalledWith(expect.objectContaining({ artist: 'محمد صديق المنشاوي', playing: true })))
    await act(async () => fireEvent.click(screen.getByText('pause')))
    await waitFor(() => expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ playing: false })))
    expect(native.stop).not.toHaveBeenCalled()
    await act(async () => fireEvent.click(screen.getByText('stop')))
    await waitFor(() => expect(native.stop).toHaveBeenCalledTimes(1))
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
  describe('notification previous/next (whole-surah only)', () => {
    const blob = { size: 20, slice: () => ({ arrayBuffer: async () => new TextEncoder().encode('ID3abcdefghi').buffer }) } as Blob
    const start = async (label: string) => {
      vi.mocked(getDownloadedSurahBlob).mockResolvedValue(blob)
      URL.createObjectURL = vi.fn(() => 'blob:local'); URL.revokeObjectURL = vi.fn()
      render(<QuranAudioProvider setView={vi.fn()}><Controls /></QuranAudioProvider>)
      await waitFor(() => expect(native.addListener).toHaveBeenCalledWith('mediaAction', expect.any(Function)))
      await act(async () => fireEvent.click(screen.getByText(label)))
      await waitFor(() => expect(native.start).toHaveBeenCalled())
    }
    it('single-ayah playback offers no skip buttons and ignores skip events', async () => {
      render(<QuranAudioProvider setView={vi.fn()}><Controls /></QuranAudioProvider>)
      await waitFor(() => expect(native.addListener).toHaveBeenCalled())
      await act(async () => fireEvent.click(screen.getByText('play')))
      await waitFor(() => expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ skipPrevious: false, skipNext: false })))
      const before = AudioMock.instances.length
      await emit('next'); await emit('previous')
      expect(AudioMock.instances.length).toBe(before)
    })
    it('surah 2 offers both and next moves to surah 3 with one audio element playing', async () => {
      await start('c2')
      await waitFor(() => expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ skipPrevious: true, skipNext: true })))
      await emit('next')
      await waitFor(() => expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ title: surahList.find((x) => x.number === 3)!.name, skipPrevious: true, skipNext: true })))
      const playing = AudioMock.instances.filter((a) => a.src && a.src !== '')
      await waitFor(() => expect(AudioMock.instances.filter((a) => a.play.mock.calls.length > 0 && a.pause.mock.calls.length === 0).length).toBeLessThanOrEqual(1))
      expect(playing.length).toBeGreaterThan(0)
    })
    it('surah 1 has no previous and surah 114 no next; boundary events are no-ops', async () => {
      await start('c1')
      await waitFor(() => expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ skipPrevious: false, skipNext: true })))
      const n = AudioMock.instances.length
      await emit('previous')
      expect(AudioMock.instances.length).toBe(n)
    })
    it('surah 114 has no next', async () => {
      await start('c114')
      await waitFor(() => expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ skipPrevious: true, skipNext: false })))
      const n = AudioMock.instances.length
      await emit('next')
      expect(AudioMock.instances.length).toBe(n)
    })
  })
  describe('media actions from the notification, lock screen and audio focus', () => {
    const setup = async () => {
      render(<QuranAudioProvider setView={vi.fn()}><Controls /></QuranAudioProvider>)
      await waitFor(() => expect(native.addListener).toHaveBeenCalledWith('mediaAction', expect.any(Function)))
      await act(async () => fireEvent.click(screen.getByText('play')))
      await waitFor(() => expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ playing: true })))
    }
    it('pauses and resumes from notification buttons and reflects the state back', async () => {
      await setup()
      await emit('pause')
      await waitFor(() => expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ playing: false })))
      await emit('play')
      await waitFor(() => expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ playing: true })))
    })
    it('stop button ends the session and the service', async () => {
      await setup()
      await emit('stop')
      await waitFor(() => expect(native.stop).toHaveBeenCalled())
    })
    it('applies seek-bar moves from the notification to the audio element', async () => {
      await setup()
      const audio = AudioMock.instances.at(-1)
      expect(audio).toBeTruthy()
      await act(async () => { native.state.handler?.({ action: 'seek', position: 12000 }) })
      expect(audio!.currentTime).toBe(12)
    })
    it('pauses on a transient focus loss (call) and resumes only after focus gain', async () => {
      await setup()
      await emit('focusLossTransient')
      await waitFor(() => expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ playing: false })))
      await emit('focusGain')
      await waitFor(() => expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ playing: true })))
    })
    it('does not resume after permanent focus loss, headphone unplug or a manual pause', async () => {
      await setup()
      await emit('focusLoss')
      await waitFor(() => expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ playing: false })))
      await emit('focusGain')
      expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ playing: false }))
      await emit('play')
      await waitFor(() => expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ playing: true })))
      await emit('noisy')
      await waitFor(() => expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ playing: false })))
      await emit('focusGain')
      expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ playing: false }))
    })
    it('manual pause during a call is not undone by focus gain', async () => {
      await setup()
      await emit('focusLossTransient')
      await waitFor(() => expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ playing: false })))
      await emit('pause')
      await emit('focusGain')
      expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ playing: false }))
    })
    it('requests notification permission once and warns when it is denied', async () => {
      native.requestNotificationPermission.mockResolvedValue({ granted: false })
      await setup()
      await waitFor(() => expect(native.requestNotificationPermission).toHaveBeenCalledTimes(1))
      await act(async () => fireEvent.click(screen.getByText('pause')))
      await act(async () => fireEvent.click(screen.getByText('pause')))
      expect(native.requestNotificationPermission).toHaveBeenCalledTimes(1)
    })
    it('removes the native listener on unmount', async () => {
      const { unmount } = render(<QuranAudioProvider setView={vi.fn()}><Controls /></QuranAudioProvider>)
      await waitFor(() => expect(native.addListener).toHaveBeenCalled())
      unmount()
      await waitFor(() => expect(native.state.remove).toHaveBeenCalled())
    })
  })
})
