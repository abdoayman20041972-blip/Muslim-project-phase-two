import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import { surahList } from '../../../quran-meta'
import { type Ayah, type View } from '../../constants'
import { QURAN_AUDIO_RECITER_LABELS, type QuranAudioReciter } from './quranAudioPlayback'
import { QuranAudioSession } from './quranAudioSession'
import { useQuranPreferences } from './useQuranPreferences'

// One shared dynamic import, so concurrent callers never race on first load.
let audioPlugin: Promise<typeof import('@muslim/background-audio')> | undefined
const loadAudioPlugin = () => (audioPlugin ??= import('@muslim/background-audio').catch((error) => { audioPlugin = undefined; throw error }))

function useSession() {
  const [session] = useState(() => new QuranAudioSession())
  const [state, setState] = useState(session.state)
  useEffect(() => session.subscribe(() => setState(session.state)), [session])
  useEffect(() => {
    const save = () => session.save()
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', save)
    return () => {
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', save)
      session.stop(false)
    }
  }, [session])
  return { session, state }
}

function useAudioValue() {
  const { session, state } = useSession()
  const preferences = useQuranPreferences()
  const reciter = preferences.reciter as QuranAudioReciter
  const [repeat, setRepeatState] = useState<'off' | 'ayah' | 'surah'>('off')
  const nativeQueue = useRef(Promise.resolve())
  const request = state.request
  const playing = state.status === 'playing'
  // Protect offline and online playback during loading as well as playing.
  const active = playing || state.status === 'loading'
  useEffect(() => { session.switchReciter(reciter) }, [reciter, session])
  const setReciter = useCallback((next: QuranAudioReciter) => {
    preferences.setReciter(next)
    session.switchReciter(next)
  }, [preferences.setReciter, session])
  const setRepeat = useCallback((value: typeof repeat) => { session.repeat = value; setRepeatState(value) }, [session])
  const playSingleAyah = useCallback((ayah: Ayah, selectedReciter: QuranAudioReciter, surahNumber: number) => {
    preferences.setReciter(selectedReciter)
    void session.start({ kind: 'single-ayah', ayah, reciter: selectedReciter, surah: surahNumber })
  }, [session, preferences.setReciter])
  // Complete-surah recordings have no verified ayah timestamps. Index is deliberately
  // ignored and the UI explicitly labels playback as starting at the beginning.
  const playConnected = useCallback((_index: number, list: Ayah[], selectedReciter: QuranAudioReciter, surahNumber: number, _withBismillah = false) => {
    if (!list.length) return
    preferences.setReciter(selectedReciter)
    void session.start({ kind: 'connected', reciter: selectedReciter, surah: surahNumber })
  }, [session, preferences.setReciter])
  const toggle = useCallback((list: Ayah[], selectedReciter: QuranAudioReciter, surahNumber: number, startIndex: number, withBismillah = false) => {
    if (session.state.request?.surah === surahNumber && session.state.request.reciter === selectedReciter) session.toggle()
    else playConnected(startIndex, list, selectedReciter, surahNumber, withBismillah)
  }, [session, playConnected])

  const title = request ? surahList.find((item) => item.number === request.surah)?.name || 'تلاوة القرآن' : 'تلاوة القرآن'
  const artist = request ? QURAN_AUDIO_RECITER_LABELS[request.reciter] : ''
  // The native service lives as long as a session exists (loading, playing or paused), so the
  // notification and lock screen keep their controls while paused. Idle or error stops it.
  const serviceNeeded = !!request && ['loading', 'playing', 'paused'].includes(state.status)
  const secondsRef = useRef(state.seconds)
  secondsRef.current = state.seconds
  const notificationAsked = useRef(false)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let current = true
    // Serialize native start/update/stop, including unmount, so an old async call cannot
    // arrive after a stop or replace a newer session's state.
    nativeQueue.current = nativeQueue.current.catch(() => {}).then(async () => {
      if (!current) return
      try {
        const { BackgroundAudio } = await loadAudioPlugin()
        if (!current) return
        if (serviceNeeded) {
          await BackgroundAudio.start({ title, artist, playing: active, position: secondsRef.current, duration: state.duration })
          if (!notificationAsked.current) {
            notificationAsked.current = true
            const permission = await BackgroundAudio.requestNotificationPermission()
            if (!permission.granted) setNotificationWarning('الإشعارات مغلقة، فلن تظهر أزرار التحكم في الإشعار وشاشة القفل. فعّلها من إعدادات التطبيق.')
            // Android posts nothing for a service started before the permission existed, so
            // start it again now that the answer is known.
            else if (current) await BackgroundAudio.start({ title, artist, playing: active, position: secondsRef.current, duration: state.duration })
          }
        } else await BackgroundAudio.stop()
      } catch {
        if (current && serviceNeeded) setBackgroundWarning('تعذر تفعيل خدمة الخلفية. استمرار الصوت عند قفل الشاشة غير مضمون.')
      }
    })
    return () => { current = false }
  }, [serviceNeeded, active, title, artist, state.duration])
  const [backgroundWarning, setBackgroundWarning] = useState<string | null>(null)
  const [notificationWarning, setNotificationWarning] = useState<string | null>(null)
  useEffect(() => { setBackgroundWarning(null) }, [request])
  // Buttons, media keys and audio-focus changes arrive from the native service. The audio
  // element stays the source of truth: apply the request, then the service is updated by state.
  const pausedByFocus = useRef(false)
  useEffect(() => { if (state.status === 'playing') pausedByFocus.current = false }, [state.status])
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let remove: (() => Promise<void>) | undefined
    let disposed = false
    void loadAudioPlugin().then(async ({ BackgroundAudio }) => {
      const handle = await BackgroundAudio.addListener('mediaAction', ({ action }) => {
        const status = session.state.status
        const running = status === 'playing' || status === 'loading'
        switch (action) {
          case 'play': pausedByFocus.current = false; if (status === 'paused' || status === 'error') session.toggle(); break
          case 'pause': pausedByFocus.current = false; if (running) session.toggle(); break
          case 'stop': pausedByFocus.current = false; session.stop(); break
          case 'focusLossTransient': if (running) { pausedByFocus.current = true; session.toggle() } break
          case 'focusLoss': case 'noisy': pausedByFocus.current = false; if (running) session.toggle(); break
          case 'focusGain': if (pausedByFocus.current && status === 'paused') { pausedByFocus.current = false; session.toggle() } break
        }
      })
      if (disposed) void handle.remove(); else remove = handle.remove
    }).catch(() => { /* Background service unavailable; the warning is shown on playback. */ })
    return () => { disposed = true; void remove?.() }
  }, [session])
  useEffect(() => () => {
    if (!Capacitor.isNativePlatform()) return
    nativeQueue.current = nativeQueue.current.catch(() => {}).then(async () => {
      try { const { BackgroundAudio } = await loadAudioPlugin(); await BackgroundAudio.stop() } catch { /* App is closing. */ }
    })
  }, [])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const media = navigator.mediaSession
    try {
      media.setActionHandler('play', () => { if (session.state.status !== 'playing') session.toggle() })
      media.setActionHandler('pause', () => { if (['playing', 'loading'].includes(session.state.status)) session.toggle() })
      media.setActionHandler('stop', () => session.stop())
    } catch { /* Some web engines support only a subset. */ }
    return () => {
      try {
        media.setActionHandler('play', null); media.setActionHandler('pause', null); media.setActionHandler('stop', null)
        media.metadata = null; media.playbackState = 'none'
      } catch { /* Unsupported API. */ }
    }
  }, [session])
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.playbackState = !request ? 'none' : playing ? 'playing' : 'paused'
      if (!request) navigator.mediaSession.metadata = null
      else if ('MediaMetadata' in window) navigator.mediaSession.metadata = new MediaMetadata({
        title: request.kind === 'single-ayah' ? `${title} - الآية ${request.ayah!.numberInSurah}` : `${title} - تلاوة متصلة`, artist, album: 'مسلم',
      })
    } catch { /* Optional browser feature. */ }
  }, [request, playing, title, artist])

  return {
    reciter, setReciter, playing, buffering: state.status === 'loading',
    current: request?.kind === 'single-ayah' ? request.ayah!.numberInSurah : null,
    currentSurah: request?.surah ?? null,
    playback: request ? { kind: request.kind, reciter: request.reciter } : null,
    audioProgress: state.seconds, audioDuration: state.duration, audio: state.audio,
    source: state.source, error: state.error, backgroundWarning: backgroundWarning ?? notificationWarning,
    saved: state.saved, restore: () => { if (session.state.saved) preferences.setReciter(session.state.saved.reciter); session.restore() }, retry: session.retry,
    stop: () => session.stop(), toggleCurrent: session.toggle, playSingleAyah, playConnected, toggle, repeat, setRepeat,
  }
}
const QuranAudioContext = createContext<ReturnType<typeof useAudioValue> | null>(null)
export function QuranAudioProvider({ children }: { children: ReactNode; setView: (view: View) => void }) {
  const value = useAudioValue()
  return <QuranAudioContext.Provider value={value}>{children}</QuranAudioContext.Provider>
}
export function useQuranAudio() {
  const context = useContext(QuranAudioContext)
  if (!context) throw new Error('useQuranAudio must be used inside QuranAudioProvider')
  return context
}
