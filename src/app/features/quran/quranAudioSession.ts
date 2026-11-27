import type { Ayah } from '../../constants'
import { quranAudioUrl, quranSurahAudioUrl } from '../../constants'
import { getDownloadedSurahBlob } from './offlineDownload'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'
import { surahList } from '../../../quran-meta'
import { isQuranAudioReciter, type QuranAudioReciter } from './quranAudioPlayback'

export type SessionRequest = {
  kind: 'connected' | 'single-ayah' | 'memorize'
  reciter: QuranAudioReciter
  surah: number
  ayah?: Ayah
  // Memorization drill fields (kind === 'memorize' only).
  from?: number
  to?: number
  repeats?: number
  gapMs?: number
  /** Completed plays of the current ayah; done === repeats marks the drill finished. */
  done?: number
}

export type MemorizePlan = {
  reciter: QuranAudioReciter
  surah: number
  from: Ayah
  to: number
  repeats: number
  gapMs: number
}

export const MEMORIZE_LIMITS = { repeatsMin: 1, repeatsMax: 20, gapMsMin: 0, gapMsMax: 10000 } as const

export function createMemorizeRequest(plan: MemorizePlan): SessionRequest {
  const meta = surahList.find((item) => item.number === plan.surah)
  if (!meta) throw new RangeError('surah must be between 1 and 114')
  if (!Number.isInteger(plan.from.numberInSurah) || plan.from.numberInSurah < 1 || plan.from.numberInSurah > meta.numberOfAyahs) {
    throw new RangeError('from ayah is outside the surah')
  }
  if (!Number.isInteger(plan.to) || plan.to < plan.from.numberInSurah || plan.to > meta.numberOfAyahs) {
    throw new RangeError('to must be within [from, surah ayah count]')
  }
  if (!Number.isInteger(plan.repeats) || plan.repeats < MEMORIZE_LIMITS.repeatsMin || plan.repeats > MEMORIZE_LIMITS.repeatsMax) {
    throw new RangeError(`repeats must be ${MEMORIZE_LIMITS.repeatsMin}..${MEMORIZE_LIMITS.repeatsMax}`)
  }
  if (!Number.isFinite(plan.gapMs) || plan.gapMs < MEMORIZE_LIMITS.gapMsMin || plan.gapMs > MEMORIZE_LIMITS.gapMsMax) {
    throw new RangeError(`gapMs must be ${MEMORIZE_LIMITS.gapMsMin}..${MEMORIZE_LIMITS.gapMsMax}`)
  }
  return { kind: 'memorize', reciter: plan.reciter, surah: plan.surah, ayah: plan.from, from: plan.from.numberInSurah, to: plan.to, repeats: plan.repeats, gapMs: plan.gapMs, done: 0 }
}
export type SavedSession = SessionRequest & { seconds: number; version: 1 }
export type SessionState = {
  request: SessionRequest | null
  audio: HTMLAudioElement | null
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'
  source: 'online' | 'offline' | null
  seconds: number
  duration: number
  error: string | null
  saved: SavedSession | null
  /** True during the configurable silence between memorization repetitions. */
  gap: boolean
}
export const QURAN_SESSION_KEY = 'muslim-quran-audio-session-v1'
const EMPTY: Omit<SessionState, 'saved'> = { request: null, audio: null, status: 'idle', source: null, seconds: 0, duration: 0, error: null, gap: false }

export function readSavedSession(): SavedSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(QURAN_SESSION_KEY) || 'null') as SavedSession | null
    if (!value || value.version !== 1 || !isQuranAudioReciter(value.reciter) ||
      !Number.isInteger(value.surah) || value.surah < 1 || value.surah > 114 ||
      !Number.isFinite(value.seconds) || value.seconds < 0 ||
      !['connected', 'single-ayah'].includes(value.kind)) return null
    if (value.kind === 'single-ayah' && (!Number.isInteger(value.ayah?.number) ||
      !Number.isInteger(value.ayah?.numberInSurah) || value.ayah!.number < 1 || value.ayah!.number > 6236 ||
      value.ayah!.numberInSurah < 1 || value.ayah!.numberInSurah > 286)) return null
    return value
  } catch { return null }
}

// Playback-time guard only. Download validation/management belongs to phase five.
export async function isPlayableDownload(blob: Blob): Promise<boolean> {
  if (blob.size < 12) return false
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer())
  const ascii = String.fromCharCode(...bytes)
  return ascii.startsWith('ID3') || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) ||
    ascii.startsWith('OggS') || (ascii.startsWith('RIFF') && ascii.slice(8) === 'WAVE') || ascii.slice(4, 8) === 'ftyp'
}

/** Sole owner of every audio element and Blob URL, independent of reader mounts. */
export class QuranAudioSession {
  state: SessionState = { ...EMPTY, saved: readSavedSession() }
  repeat: 'off' | 'ayah' | 'surah' = 'off'
  private epoch = 0
  private continuation = 0
  private release: (() => void) | null = null
  private url: string | null = null
  private lastSave = 0
  private autoplay = true
  private resumeAt = 0
  private listeners = new Set<() => void>()
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private update(patch: Partial<SessionState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => listener())
  }
  private disposeAudio() {
    this.release?.()
    this.release = null
    if (this.url) URL.revokeObjectURL(this.url)
    this.url = null
  }
  save = () => {
    const { request, audio } = this.state
    // A memorization drill is a focused exercise, not a listening position to resume.
    if (!request || request.kind === 'memorize') return
    const seconds = this.resumeAt > 0 ? this.resumeAt : audio && Number.isFinite(audio.currentTime) ? audio.currentTime : this.state.seconds
    const saved: SavedSession = { ...request, seconds, version: 1 }
    try { localStorage.setItem(QURAN_SESSION_KEY, JSON.stringify(saved)) } catch { /* Playback works when storage is full/disabled. */ }
    this.update({ saved })
    this.lastSave = Date.now()
  }
  stop = (forget = true) => {
    if (!forget) this.save()
    ++this.epoch
    ++this.continuation
    this.clearGap()
    this.disposeAudio()
    if (forget) {
      try { localStorage.removeItem(QURAN_SESSION_KEY) } catch { /* optional */ }
    }
    this.resumeAt = 0
    this.update({ ...EMPTY, saved: forget ? null : this.state.saved })
  }
  start = async (request: SessionRequest, autoplay = true, seconds = 0) => {
    this.save()
    const epoch = ++this.epoch
    ++this.continuation
    this.clearGap()
    this.disposeAudio()
    this.autoplay = autoplay
    this.resumeAt = seconds
    this.update({ ...EMPTY, request, status: 'loading', seconds })
    if (request.kind === 'connected') {
      try {
        const blob = await this.localBlob(request)
        if (epoch !== this.epoch) return
        if (blob && await isPlayableDownload(blob)) {
          if (epoch !== this.epoch) return
          this.url = URL.createObjectURL(blob)
          this.attach(request, this.url, 'offline', epoch)
          return
        }
      } catch { /* Missing/unsupported storage must not prevent online playback. */ }
    }
    // Memorize drills play the plain per-ayah CDN URL like any media element:
    // the CDN sends no CORS headers, so page-context fetch caching cannot work
    // (offline reuse is the service worker's job - see center/memorizeAudioCache).
    if (epoch === this.epoch) this.attach(request, this.onlineUrl(request), 'online', epoch)
  }
  private async localBlob(request: SessionRequest): Promise<Blob | undefined> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        getDownloadedSurahBlob(request.reciter, request.surah),
        new Promise<undefined>((resolve) => { timer = setTimeout(() => resolve(undefined), 10000) }),
      ])
    } finally { if (timer) clearTimeout(timer) }
  }
  private onlineUrl(request: SessionRequest) {
    return request.kind === 'connected' ? quranSurahAudioUrl(request.reciter, request.surah) : quranAudioUrl(request.reciter, request.ayah!.number)
  }
  private attach(request: SessionRequest, src: string, source: 'online' | 'offline', epoch: number) {
    const audio = new Audio()
    audio.preload = 'auto'
    const valid = () => this.epoch === epoch && this.state.audio === audio
    let loadTimer: ReturnType<typeof setTimeout> | undefined
    const clearLoadTimer = () => { if (loadTimer) clearTimeout(loadTimer) }
    const failed = () => {
      clearLoadTimer()
      if (!valid() || this.state.status === 'paused' || this.state.status === 'error') return
      if (source === 'offline') {
        // A plausible header is not proof the decoder accepts the whole file.
        this.resumeAt = Number.isFinite(audio.currentTime) ? audio.currentTime : this.state.seconds
        this.disposeAudio()
        this.attach(request, this.onlineUrl(request), 'online', epoch)
      } else {
        audio.pause()
        this.save()
        this.update({ status: 'error', error: 'تعذر تشغيل التلاوة. تحقق من الاتصال أو الملف المنزّل ثم أعد المحاولة.' })
      }
    }
    const metadata = () => {
      if (!valid()) return
      if (!this.autoplay) clearLoadTimer()
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0
      if (this.resumeAt > 0) {
        try { audio.currentTime = duration > 0 ? Math.min(this.resumeAt, Math.max(0, duration - 0.1)) : this.resumeAt } catch { /* Retry is available on failure. */ }
        this.resumeAt = 0
      }
      this.update({ duration, seconds: audio.currentTime })
    }
    const time = () => {
      if (!valid()) return
      this.update({ seconds: audio.currentTime })
      if (Date.now() - this.lastSave >= 5000) this.save()
    }
    const ended = () => {
      if (!valid()) return
      if (request.kind === 'memorize') {
        const done = request.done ?? 0
        const repeats = request.repeats ?? 1
        const to = request.to ?? request.ayah?.numberInSurah ?? 0
        if (request.ayah && done + 1 < repeats) {
          this.afterGap(request, { ...request, done: done + 1 })
        } else if (request.ayah && request.ayah.numberInSurah < to) {
          const ayah = { number: request.ayah.number + 1, numberInSurah: request.ayah.numberInSurah + 1, text: '' }
          this.afterGap(request, { ...request, ayah, done: 0 })
        } else {
          audio.currentTime = 0
          this.update({ request: { ...request, done: repeats }, status: 'paused', seconds: 0 })
        }
        return
      }
      if ((request.kind === 'single-ayah' && this.repeat === 'ayah') || (request.kind === 'connected' && this.repeat === 'surah')) {
        audio.currentTime = 0
        this.resumeAt = 0
        this.play(audio, epoch)
      // A single ayah plays that ayah only and then stops (it never rolls on into the rest of the surah).
      } else {
        audio.currentTime = 0
        this.update({ status: 'paused', seconds: 0 })
        this.save()
        if (request.kind === 'connected' && request.surah < 114 && readSetting(APP_SETTINGS_KEYS.dataSaver, '0') !== '1') {
          const continuation = ++this.continuation
          void (async () => {
            try {
              const next = request.surah + 1
              if (source === 'offline') {
                const blob = await this.localBlob({ ...request, surah: next })
                if (!blob || !await isPlayableDownload(blob)) return
              }
              if (!valid() || continuation !== this.continuation) return
              await this.start({ ...request, surah: next })
            } catch { /* End quietly if a subsequent recording is unavailable. */ }
          })()
        }
      }
    }
    const handlers = {
      playing: () => { clearLoadTimer(); if (valid()) { this.update({ status: 'playing', error: null }); this.save() } },
      pause: () => { clearLoadTimer(); if (valid() && this.state.status !== 'error') { this.update({ status: 'paused' }); this.save() } },
      waiting: () => { if (valid() && this.autoplay) { clearLoadTimer(); loadTimer = setTimeout(failed, 30000); this.update({ status: 'loading' }) } },
      loadedmetadata: metadata, durationchange: metadata, timeupdate: time, ended, error: failed,
    }
    Object.entries(handlers).forEach(([name, handler]) => audio.addEventListener(name, handler))
    this.release = () => {
      clearLoadTimer()
      Object.entries(handlers).forEach(([name, handler]) => audio.removeEventListener(name, handler))
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    this.update({ audio, source, status: this.autoplay ? 'loading' : 'paused' })
    loadTimer = setTimeout(failed, 30000)
    audio.src = src
    if (this.autoplay) this.play(audio, epoch)
    else audio.load()
  }
  private gapTimer: ReturnType<typeof setTimeout> | null = null
  private gapNext: SessionRequest | null = null
  private clearGap() {
    if (this.gapTimer) clearTimeout(this.gapTimer)
    this.gapTimer = null
    this.gapNext = null
  }
  /** Silence window between memorization repetitions; guarded against stop/start. */
  private afterGap(request: SessionRequest, next: SessionRequest) {
    const gapMs = Math.max(0, request.gapMs ?? 0)
    if (!gapMs) { void this.start(next); return }
    const epoch = this.epoch
    const continuation = ++this.continuation
    this.gapNext = next
    this.update({ gap: true })
    this.gapTimer = setTimeout(() => {
      this.gapTimer = null
      if (this.epoch !== epoch || continuation !== this.continuation) return
      this.gapNext = null
      this.update({ gap: false })
      void this.start(next)
    }, gapMs)
  }
  private play(audio: HTMLAudioElement, epoch: number) {
    this.autoplay = true
    this.update({ status: 'loading', error: null })
    void audio.play().catch(() => {
      if (epoch === this.epoch && audio === this.state.audio && this.autoplay) this.update({ status: 'error', error: 'تعذر بدء الصوت. اضغط إعادة المحاولة للسماح بالتشغيل.' })
    })
  }
  toggle = () => {
    // During a memorization silence window the toggle skips the wait and plays
    // the next repetition immediately; pausing mid-gap would feel like a hang.
    if (this.state.gap) {
      const next = this.gapNext
      this.clearGap()
      ++this.continuation
      this.update({ gap: false })
      if (next) void this.start(next)
      return
    }
    ++this.continuation
    const { audio, status, request } = this.state
    if (!request) return
    if (status === 'playing' || status === 'loading') {
      this.autoplay = false
      audio?.pause()
      this.update({ status: 'paused' })
      this.save()
    } else if (status === 'error') this.retry()
    else if (audio) this.play(audio, this.epoch)
    // Unreachable today (start always attaches audio, stop clears the request).
    // If a future change ever reaches this with a request but no audio, retry
    // rebuilds the session instead of hanging in 'loading' with no source.
    else this.retry()
  }
  retry = () => {
    const { request, seconds } = this.state
    if (request) void this.start(request, true, seconds)
  }
  /** Notification/lock-screen seek bar. The audio element is the position source of truth. */
  seek = (seconds: number) => {
    const { audio, request } = this.state
    if (!request || !audio || !Number.isFinite(seconds) || seconds < 0) return
    try {
      audio.currentTime = seconds
      this.update({ seconds })
      this.save()
    } catch { /* Unloaded element or beyond duration: the next timeupdate resyncs. */ }
  }
  restore = () => {
    const saved = this.state.saved
    if (saved) void this.start(saved, true, saved.seconds)
  }
  switchReciter = (reciter: QuranAudioReciter) => {
    const { request, status } = this.state
    if (!request || request.reciter === reciter) return
    // Different recordings have different timing. Never pretend seconds map between reciters.
    void this.start({ ...request, reciter }, status === 'playing' || (status === 'loading' && this.autoplay), 0)
  }
}
