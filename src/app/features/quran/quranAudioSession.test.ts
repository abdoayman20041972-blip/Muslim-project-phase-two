import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuranAudioSession, QURAN_SESSION_KEY, readSavedSession, isPlayableDownload, type SessionRequest } from './quranAudioSession'
import { getDownloadedSurahBlob } from './offlineDownload'
vi.mock('./offlineDownload', () => ({ getDownloadedSurahBlob: vi.fn() }))
const instances: FakeAudio[] = []
class FakeAudio extends EventTarget {
  src = ''; currentTime = 0; duration = 100; preload = ''
  play = vi.fn(async () => this.dispatchEvent(new Event('playing')))
  pause = vi.fn(() => this.dispatchEvent(new Event('pause')))
  load = vi.fn()
  removeAttribute = vi.fn(() => { this.src = '' })
  constructor() { super(); instances.push(this) }
}
const connected: SessionRequest = { kind: 'connected', reciter: 'ar.minshawi', surah: 114 }
const single: SessionRequest = { ...connected, kind: 'single-ayah', ayah: { number: 6236, numberInSurah: 6, text: 'آية' } }
// jsdom Blob does not implement arrayBuffer in every supported release.
const playable = () => ({ size: 20, slice: () => ({ arrayBuffer: async () => new TextEncoder().encode('ID3abcdefghi').buffer }) }) as Blob
beforeEach(() => {
  instances.length = 0; localStorage.clear(); vi.clearAllMocks()
  vi.stubGlobal('Audio', FakeAudio)
  vi.mocked(getDownloadedSurahBlob).mockResolvedValue(undefined)
  URL.createObjectURL = vi.fn(() => 'blob:test-audio')
  URL.revokeObjectURL = vi.fn()
})
describe('QuranAudioSession', () => {
  it('prefers a valid local recording and owns it until explicit stop', async () => {
    vi.mocked(getDownloadedSurahBlob).mockResolvedValue(playable())
    const session = new QuranAudioSession(); await session.start(connected)
    expect(session.state.source).toBe('offline'); expect(session.state.status).toBe('playing')
    const unsubscribe = session.subscribe(vi.fn()); unsubscribe()
    expect(instances[0].pause).not.toHaveBeenCalled()
    session.stop(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-audio')
  })
  it('rejects HTML and empty downloads, using online instead', async () => {
    const html = { size: 30, slice: () => ({ arrayBuffer: async () => new TextEncoder().encode('<html>oops!!').buffer }) } as Blob
    expect(await isPlayableDownload(html)).toBe(false)
    expect(await isPlayableDownload(new Blob([]))).toBe(false)
    vi.mocked(getDownloadedSurahBlob).mockResolvedValue(html)
    const session = new QuranAudioSession(); await session.start(connected)
    expect(session.state.source).toBe('online'); expect(instances[0].src).toContain('/114.mp3')
  })
  it('falls back online if the local decoder rejects the cached file', async () => {
    vi.mocked(getDownloadedSurahBlob).mockResolvedValue(playable())
    const session = new QuranAudioSession(); await session.start(connected)
    instances[0].dispatchEvent(new Event('error'))
    expect(session.state.source).toBe('online'); expect(instances).toHaveLength(2)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-audio')
  })
  it('invalidates an offline lookup when a newer single-ayah session starts', async () => {
    let resolve!: (blob: Blob) => void
    vi.mocked(getDownloadedSurahBlob).mockReturnValueOnce(new Promise((r) => { resolve = r }))
    const session = new QuranAudioSession(); const old = session.start(connected)
    await session.start(single); resolve(playable()); await old
    expect(instances).toHaveLength(1); expect(session.state.request?.kind).toBe('single-ayah')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
  it('invalidates a pending lookup on stop', async () => {
    let resolve!: (blob: Blob) => void
    vi.mocked(getDownloadedSurahBlob).mockReturnValueOnce(new Promise((r) => { resolve = r }))
    const session = new QuranAudioSession(); const old = session.start(connected)
    session.stop(); resolve(playable()); await old
    expect(instances).toHaveLength(0); expect(session.state.status).toBe('idle')
  })
  it('ignores stale events and play rejection after changing sessions', async () => {
    const session = new QuranAudioSession(); await session.start(single)
    const old = instances[0]; await session.start({ ...single, surah: 2 })
    old.dispatchEvent(new Event('error')); old.dispatchEvent(new Event('ended'))
    expect(session.state.request?.surah).toBe(2); expect(session.state.status).toBe('playing')
  })
  it('switches a paused reciter without starting playback or pretending timestamps align', async () => {
    const session = new QuranAudioSession(); await session.start(single)
    instances[0].currentTime = 35; session.toggle(); session.switchReciter('ar.alafasy')
    expect(session.state.status).toBe('paused'); expect(instances[1].play).not.toHaveBeenCalled()
    expect(instances[1].src).toContain('/ar.alafasy/6236.mp3'); expect(instances[1].currentTime).toBe(0)
  })
  it('keeps the newest reader through rapid switches and pending offline loads', async () => {
    const session = new QuranAudioSession(); await session.start(connected)
    session.switchReciter('ar.husary'); session.switchReciter('ar.alafasy')
    await Promise.resolve(); await Promise.resolve()
    expect(session.state.request?.reciter).toBe('ar.alafasy'); await vi.waitFor(() => expect(instances).toHaveLength(2))
  })
  it('remembers pause while offline lookup is still pending', async () => {
    let resolve!: (blob: Blob) => void
    vi.mocked(getDownloadedSurahBlob).mockReturnValueOnce(new Promise((r) => { resolve = r }))
    const session = new QuranAudioSession(); const start = session.start(connected)
    session.toggle(); resolve(playable()); await start
    expect(session.state.status).toBe('paused'); expect(instances[0].play).not.toHaveBeenCalled()
  })
  it('saves exact session position and restores only after an explicit request', async () => {
    const session = new QuranAudioSession(); await session.start(single)
    instances[0].currentTime = 37; session.toggle()
    expect(readSavedSession()?.seconds).toBe(37)
    session.stop(false); const restored = new QuranAudioSession()
    expect(restored.state.audio).toBeNull(); restored.restore()
    instances[1].dispatchEvent(new Event('loadedmetadata'))
    expect(instances[1].currentTime).toBe(37); expect(restored.state.request?.ayah?.number).toBe(6236)
  })
  it('forgets a position when the user closes the session', async () => {
    const session = new QuranAudioSession(); await session.start(single); session.stop()
    expect(readSavedSession()).toBeNull(); expect(session.state.saved).toBeNull()
  })
  it.each(['ayah', 'surah'] as const)('implements %s repeat only for the matching media kind', async (repeat) => {
    const session = new QuranAudioSession(); session.repeat = repeat
    await session.start(repeat === 'ayah' ? single : connected)
    instances[0].currentTime = 99; instances[0].dispatchEvent(new Event('ended'))
    expect(instances[0].currentTime).toBe(0); expect(instances[0].play).toHaveBeenCalledTimes(2)
  })
  it('does not pretend to repeat an ayah inside a complete-surah recording', async () => {
    const session = new QuranAudioSession(); session.repeat = 'ayah'; await session.start(connected)
    instances[0].dispatchEvent(new Event('ended'))
    expect(session.state.status).toBe('paused'); expect(instances[0].play).toHaveBeenCalledTimes(1)
  })
  it('continues from a chosen ayah through the rest of the surah, then stops', async () => {
    const session = new QuranAudioSession()
    await session.start({ ...connected, kind: 'single-ayah', surah: 1, ayah: { number: 5, numberInSurah: 5, text: '' } })
    instances[0].dispatchEvent(new Event('ended'))
    await Promise.resolve()
    expect(instances).toHaveLength(2)
    expect(instances[1].src).toContain('/6.mp3'); expect(session.state.request?.ayah?.numberInSurah).toBe(6)
    instances[1].dispatchEvent(new Event('ended')); await Promise.resolve()
    expect(instances[2].src).toContain('/7.mp3')
    instances[2].dispatchEvent(new Event('ended')); await Promise.resolve()
    expect(instances).toHaveLength(3); expect(session.state.status).toBe('paused')
  })
  it('exposes a recoverable error with a fresh retry', async () => {
    const session = new QuranAudioSession(); await session.start(single)
    instances[0].dispatchEvent(new Event('error'))
    expect(session.state.error).toBeTruthy(); session.retry()
    expect(instances).toHaveLength(2); expect(session.state.error).toBeNull()
  })
  it('rejects malformed persisted session data', () => {
    localStorage.setItem(QURAN_SESSION_KEY, JSON.stringify({ ...connected, version: 1, seconds: -1 }))
    expect(readSavedSession()).toBeNull()
    localStorage.setItem(QURAN_SESSION_KEY, JSON.stringify({ ...single, version: 1, seconds: 1, ayah: null }))
    expect(readSavedSession()).toBeNull()
  })
})

describe('session deadlines and continuation cancellation', () => {
  it('uses online playback if an IndexedDB lookup stalls', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(getDownloadedSurahBlob).mockReturnValue(new Promise(() => {}))
      const session = new QuranAudioSession(); const start = session.start(connected)
      await vi.advanceTimersByTimeAsync(10000); await start
      expect(session.state.source).toBe('online'); session.stop()
    } finally { vi.useRealTimers() }
  })
  it('does not report a metadata-ready paused recording as timed out', async () => {
    vi.useFakeTimers()
    try {
      const session = new QuranAudioSession(); await session.start(single, false)
      instances[0].dispatchEvent(new Event('loadedmetadata'))
      await vi.advanceTimersByTimeAsync(30000)
      expect(session.state.status).toBe('paused'); session.stop()
    } finally { vi.useRealTimers() }
  })
  it('cancels next-surah work when the user stops before the lookup returns', async () => {
    const session = new QuranAudioSession()
    vi.mocked(getDownloadedSurahBlob).mockResolvedValueOnce(playable())
    await session.start({ ...connected, surah: 1 })
    let resolve!: (blob: Blob) => void
    vi.mocked(getDownloadedSurahBlob).mockReturnValueOnce(new Promise((r) => { resolve = r }))
    instances[0].dispatchEvent(new Event('ended')); session.stop()
    resolve(playable()); await Promise.resolve(); await Promise.resolve()
    expect(session.state.request).toBeNull(); expect(instances).toHaveLength(1)
  })
  it('does not let a cancelled play promise turn a user pause into an error', async () => {
    const session = new QuranAudioSession(); await session.start(single)
    let reject!: () => void
    instances[0].play.mockImplementationOnce(() => new Promise((_r, no) => { reject = () => no(new Error('AbortError')) }) as Promise<boolean>)
    session.toggle(); session.toggle(); session.toggle(); reject(); await Promise.resolve()
    expect(session.state.status).toBe('paused'); expect(session.state.error).toBeNull()
    session.stop()
  })
})

it('does not overwrite a pending restored position with the pre-metadata zero', async () => {
  const session = new QuranAudioSession(); await session.start(single, true, 27)
  session.save()
  expect(readSavedSession()?.seconds).toBe(27)
  instances[0].dispatchEvent(new Event('loadedmetadata')); session.toggle()
  expect(readSavedSession()?.seconds).toBe(27)
  session.stop()
})
