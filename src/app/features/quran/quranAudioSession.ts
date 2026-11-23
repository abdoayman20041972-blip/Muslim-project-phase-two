import type { Ayah } from '../../constants'
import { quranAudioUrl, quranSurahAudioUrl } from '../../constants'
import { getDownloadedSurahBlob } from './offlineDownload'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'
import { isQuranAudioReciter, type QuranAudioReciter } from './quranAudioPlayback'

export type SessionRequest = {
  kind: 'connected' | 'single-ayah'
  reciter: QuranAudioReciter
  surah: number
  ayah?: Ayah
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
}
export const QURAN_SESSION_KEY = 'muslim-quran-audio-session-v1'
const EMPTY: Omit<SessionState, 'saved'> = { request: null, audio: null, status: 'idle', source: null, seconds: 0, duration: 0, error: null }

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
    if (!request) return
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
      if ((request.kind === 'single-ayah' && this.repeat === 'ayah') || (request.kind === 'connected' && this.repeat === 'surah')) {
        audio.currentTime = 0
        this.resumeAt = 0
        this.play(audio, epoch)
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
  private play(audio: HTMLAudioElement, epoch: number) {
    this.autoplay = true
    this.update({ status: 'loading', error: null })
    void audio.play().catch(() => {
      if (epoch === this.epoch && audio === this.state.audio && this.autoplay) this.update({ status: 'error', error: 'تعذر بدء الصوت. اضغط إعادة المحاولة للسماح بالتشغيل.' })
    })
  }
  toggle = () => {
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
    else { this.autoplay = true; this.update({ status: 'loading' }) }
  }
  retry = () => {
    const { request, seconds } = this.state
    if (request) void this.start(request, true, seconds)
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
