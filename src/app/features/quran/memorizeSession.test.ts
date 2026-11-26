import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  QuranAudioSession,
  QURAN_SESSION_KEY,
  createMemorizeRequest,
  MEMORIZE_LIMITS,
} from './quranAudioSession'
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

const ayah = (number: number, numberInSurah: number) => ({ number, numberInSurah, text: '' })
// Surah 114 has 6 ayahs; global ayah numbers 6231..6236.
const plan = (overrides: Partial<Parameters<typeof createMemorizeRequest>[0]> = {}) => ({
  reciter: 'ar.minshawi' as const,
  surah: 114,
  from: ayah(6231, 1),
  to: 2,
  repeats: 2,
  gapMs: 0,
  ...overrides,
})

beforeEach(() => {
  instances.length = 0; localStorage.clear(); vi.clearAllMocks()
  vi.stubGlobal('Audio', FakeAudio)
  vi.mocked(getDownloadedSurahBlob).mockResolvedValue(undefined)
  URL.createObjectURL = vi.fn(() => 'blob:test-audio')
  URL.revokeObjectURL = vi.fn()
})

describe('createMemorizeRequest', () => {
  it('builds a valid drill starting at the chosen ayah', () => {
    const request = createMemorizeRequest(plan())
    expect(request.kind).toBe('memorize')
    expect(request.ayah?.numberInSurah).toBe(1)
    expect(request.done).toBe(0)
  })
  it.each([
    ['surah outside 1..114', plan({ surah: 115 })],
    ['to before from', plan({ to: 0 })],
    ['to beyond the surah', plan({ to: 7 })],
    ['repeats below the minimum', plan({ repeats: 0 })],
    ['repeats above the maximum', plan({ repeats: MEMORIZE_LIMITS.repeatsMax + 1 })],
    ['negative gap', plan({ gapMs: -1 })],
    ['gap above the maximum', plan({ gapMs: MEMORIZE_LIMITS.gapMsMax + 1 })],
  ])('rejects %s', (_label, badPlan) => {
    expect(() => createMemorizeRequest(badPlan)).toThrow(RangeError)
  })
})

describe('memorization playback', () => {
  it('repeats each ayah the chosen number of times before advancing', async () => {
    const session = new QuranAudioSession()
    await session.start(createMemorizeRequest(plan()))
    expect(instances).toHaveLength(1)
    expect(instances[0].src).toContain('/ar.minshawi/6231.mp3')

    instances[0].dispatchEvent(new Event('ended'))
    await vi.waitFor(() => expect(instances).toHaveLength(2))
    expect(session.state.request?.done).toBe(1)
    expect(instances[1].src).toContain('/ar.minshawi/6231.mp3')

    instances[1].dispatchEvent(new Event('ended'))
    await vi.waitFor(() => expect(instances).toHaveLength(3))
    expect(session.state.request?.ayah?.numberInSurah).toBe(2)
    expect(session.state.request?.done).toBe(0)
    expect(instances[2].src).toContain('/ar.minshawi/6232.mp3')
  })

  it('finishes after the last repetition of the last ayah and stays put', async () => {
    const session = new QuranAudioSession()
    await session.start(createMemorizeRequest(plan()))
    instances[0].dispatchEvent(new Event('ended')) // ayah 1, play 1 of 2
    await vi.waitFor(() => expect(instances).toHaveLength(2))
    instances[1].dispatchEvent(new Event('ended')) // ayah 1 done -> ayah 2
    await vi.waitFor(() => expect(instances).toHaveLength(3))
    instances[2].dispatchEvent(new Event('ended')) // ayah 2, play 1 of 2
    await vi.waitFor(() => expect(instances).toHaveLength(4))
    instances[3].dispatchEvent(new Event('ended')) // ayah 2 done -> finished
    expect(instances).toHaveLength(4)
    expect(session.state.status).toBe('paused')
    expect(session.state.request?.done).toBe(2)
    expect(session.state.request?.ayah?.numberInSurah).toBe(2)
  })

  it('waits through the configured silence between repetitions', async () => {
    vi.useFakeTimers()
    try {
      const session = new QuranAudioSession()
      await session.start(createMemorizeRequest(plan({ gapMs: 2000 })))
      instances[0].dispatchEvent(new Event('ended'))
      expect(session.state.gap).toBe(true)
      expect(instances).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(1999)
      expect(instances).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(1)
      await vi.waitFor(() => expect(instances).toHaveLength(2))
      expect(session.state.gap).toBe(false)
    } finally { vi.useRealTimers() }
  })

  it('a tap during the silence skips straight to the next repetition', async () => {
    vi.useFakeTimers()
    try {
      const session = new QuranAudioSession()
      await session.start(createMemorizeRequest(plan({ gapMs: 5000 })))
      instances[0].dispatchEvent(new Event('ended'))
      expect(session.state.gap).toBe(true)
      session.toggle()
      await vi.waitFor(() => expect(instances).toHaveLength(2))
      expect(session.state.gap).toBe(false)
      expect(instances[1].src).toContain('/ar.minshawi/6231.mp3')
    } finally { vi.useRealTimers() }
  })

  it('stop cancels a pending silence so no stray playback starts later', async () => {
    vi.useFakeTimers()
    try {
      const session = new QuranAudioSession()
      await session.start(createMemorizeRequest(plan({ gapMs: 2000 })))
      instances[0].dispatchEvent(new Event('ended'))
      expect(session.state.gap).toBe(true)
      session.stop()
      await vi.advanceTimersByTimeAsync(10000)
      expect(instances).toHaveLength(1)
      expect(session.state.status).toBe('idle')
      expect(session.state.gap).toBe(false)
    } finally { vi.useRealTimers() }
  })

  it('never persists a drill as a resumable listening session', async () => {
    const session = new QuranAudioSession()
    await session.start(createMemorizeRequest(plan()))
    session.save()
    expect(localStorage.getItem(QURAN_SESSION_KEY)).toBeNull()
    expect(session.state.saved).toBeNull()
  })

  it('keeps a finished drill out of the way of a fresh one', async () => {
    const session = new QuranAudioSession()
    await session.start(createMemorizeRequest(plan({ to: 1, repeats: 1 })))
    instances[0].dispatchEvent(new Event('ended'))
    expect(session.state.request?.done).toBe(1)
    await session.start(createMemorizeRequest(plan()))
    expect(session.state.request?.done).toBe(0)
    expect(session.state.status).toBe('playing')
    expect(instances).toHaveLength(2)
  })
})
