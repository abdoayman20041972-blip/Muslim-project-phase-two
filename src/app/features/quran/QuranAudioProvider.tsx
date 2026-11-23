import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import { surahList } from '../../../quran-meta'
import { type Ayah, type View } from '../../constants'
import { QURAN_AUDIO_RECITER_LABELS, type QuranAudioReciter } from './quranAudioPlayback'
import { QuranAudioSession } from './quranAudioSession'
import { useQuranPreferences } from './useQuranPreferences'

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
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let current = true
    // Serialize native start/stop, including unmount, so an old async start cannot
    // arrive after a stop or replace a newer session's metadata.
    nativeQueue.current = nativeQueue.current.catch(() => {}).then(async () => {
      if (!current) return
      try {
        const { BackgroundAudio } = await import('@muslim/background-audio')
        if (!current) return
        if (active) await BackgroundAudio.start({ title, artist })
        else await BackgroundAudio.stop()
      } catch {
        if (current && active) setBackgroundWarning('تعذر تفعيل خدمة الخلفية. استمرار الصوت عند قفل الشاشة غير مضمون.')
      }
    })
    return () => { current = false }
  }, [active, title, artist])
  const [backgroundWarning, setBackgroundWarning] = useState<string | null>(null)
  useEffect(() => { setBackgroundWarning(null) }, [request])
  useEffect(() => () => {
    if (!Capacitor.isNativePlatform()) return
    nativeQueue.current = nativeQueue.current.catch(() => {}).then(async () => {
      try { const { BackgroundAudio } = await import('@muslim/background-audio'); await BackgroundAudio.stop() } catch { /* App is closing. */ }
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
    source: state.source, error: state.error, backgroundWarning,
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
