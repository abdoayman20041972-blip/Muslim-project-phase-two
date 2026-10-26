import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import { surahList } from '../../../quran-meta'
import { quranAudioUrl, quranSurahAudioUrl, type Ayah, type View } from '../../constants'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'
import { createConnectedPlayback, QURAN_AUDIO_RECITER_LABELS, type ConnectedPlayback, type QuranAudioReciter, type SingleAyahPlayback } from './quranAudioPlayback'
import { loadSurah } from './loadSurah'

type AudioContextValue = {
  reciter: QuranAudioReciter
  current: number | null
  currentSurah: number | null
  playing: boolean
  buffering: boolean
  audioProgress: number
  audioDuration: number
  playback: SingleAyahPlayback | ConnectedPlayback | null
  audio: HTMLAudioElement | null
  playSingleAyah: (ayah: Ayah, selectedReciter: QuranAudioReciter, surahNumber: number) => void
  playConnected: (
    index: number,
    list: Ayah[],
    selectedReciter: QuranAudioReciter,
    surahNumber: number,
    withBismillah?: boolean,
  ) => void
  toggleCurrent: () => void
  toggle: (
    list: Ayah[],
    selectedReciter: QuranAudioReciter,
    surahNumber: number,
    startIndex: number,
    withBismillah?: boolean,
  ) => void
  stop: () => void
  repeat: 'off' | 'ayah' | 'surah'
  setRepeat: (repeat: 'off' | 'ayah' | 'surah') => void
  selectAyah: (ayahNumber: number, surahNumber: number) => void
  setReciter: (reciter: QuranAudioReciter) => void
}

const QuranAudioContext = createContext<AudioContextValue | null>(null)

type Props = { children: ReactNode; setView: (view: View) => void }

export function QuranAudioProvider({ children, setView }: Props) {
  const [reciter, setReciterState] = useState<QuranAudioReciter>('ar.minshawi')
  const [current, setCurrent] = useState<number | null>(null)
  const [currentSurah, setCurrentSurah] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [repeat, setRepeat] = useState<'off' | 'ayah' | 'surah'>('off')
  const repeatRef = useRef<'off' | 'ayah' | 'surah'>('off')
  const [playback, setPlayback] = useState<SingleAyahPlayback | ConnectedPlayback | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const cleanup = useRef<(() => void) | null>(null)
  const reciterSwitchRef = useRef(0)
  const sessionRef = useRef<{ list: Ayah[]; index: number; reciter: QuranAudioReciter; surah: number; bismillah: boolean } | null>(null)

  const stopBackgroundAudio = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return
    try {
      const { BackgroundAudio } = await import('@muslim/background-audio')
      await BackgroundAudio.stop()
    } catch {}
  }, [])

  const stop = useCallback(() => {
    cleanup.current?.()
    cleanup.current = null
    audio.current?.pause()
    if (audio.current) audio.current.src = ''
    audio.current = null
    setPlaying(false)
    setBuffering(false)
    setAudioProgress(0)
    setAudioDuration(0)
    setCurrent(null)
    setCurrentSurah(null)
    setPlayback(null)
    void stopBackgroundAudio()
  }, [stopBackgroundAudio])

  const updateMediaSession = useCallback((surahNumber: number, selectedReciter: QuranAudioReciter, ayahNumber?: number) => {
    if (!('mediaSession' in navigator)) return
    try {
      const surah = surahList.find((item) => item.number === surahNumber)
      if ('MediaMetadata' in window) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: surah ? (ayahNumber ? `${surah.name} — الآية ${ayahNumber}` : `${surah.name} — تلاوة متصلة`) : (ayahNumber ? `الآية ${ayahNumber}` : 'تلاوة متصلة'),
          artist: QURAN_AUDIO_RECITER_LABELS[selectedReciter] || selectedReciter,
          album: 'مسلم',
        })
      }
    } catch {}
  }, [])

  const playAt = useCallback((
    index: number,
    list: Ayah[],
    selectedReciter: QuranAudioReciter,
    surahNumber: number,
    withBismillah: boolean,
    connected: boolean,
    preparedAudio?: HTMLAudioElement,
  ) => {
    const ayah = list[index]
    if (!ayah) return
    stop()
    sessionRef.current = { list, index, reciter: selectedReciter, surah: surahNumber, bismillah: withBismillah }
    setCurrent(connected ? null : ayah.numberInSurah)
    setCurrentSurah(surahNumber)
    setReciterState(selectedReciter)
    const nextPlayback = connected
      ? createConnectedPlayback(selectedReciter, surahNumber)
      : {
          kind: 'single-ayah' as const,
          reciter: selectedReciter,
          ayahNumber: ayah.number,
          source: quranAudioUrl(selectedReciter, ayah.number, withBismillah),
        }
    setPlayback(nextPlayback)
    const source = connected
      ? quranSurahAudioUrl(selectedReciter, surahNumber)
      : quranAudioUrl(selectedReciter, ayah.number, withBismillah)
    const el = preparedAudio ?? new Audio(source)
    el.preload = 'auto'
    if (!preparedAudio) el.src = source
    audio.current = el
    updateMediaSession(surahNumber, selectedReciter, connected ? undefined : ayah.numberInSurah)
    const onPlay = () => { if (audio.current === el) { setBuffering(false); setPlaying(true) } }
    const onWait = () => { if (audio.current === el) setBuffering(true) }
    const onLoaded = () => { if (audio.current === el) setAudioDuration(Number.isFinite(el.duration) ? el.duration : 0) }
    const onTime = () => { if (audio.current === el) setAudioProgress(el.currentTime) }
    const onEnd = () => {
      if (audio.current !== el) return
      const session = sessionRef.current
      if (!session) return
      if (!connected) { setPlaying(false); setBuffering(false); return }
      if (repeatRef.current === 'surah') {
        playAt(0, session.list, session.reciter, session.surah, session.surah !== 1 && session.surah !== 9, true)
        return
      }
      if (readSetting(APP_SETTINGS_KEYS.dataSaver, '0') !== '1' && session.surah < 114) {
        void (async () => {
          try {
            const next = session.surah + 1
            const nextList = await loadSurah(next)
            setView({ name: 'mushaf-surah', number: next })
            playAt(0, nextList, session.reciter, next, next !== 1 && next !== 9, true)
          } catch {
            setPlaying(false)
            setBuffering(false)
          }
        })()
      } else {
        setPlaying(false)
        setBuffering(false)
      }
    }
    const onError = () => { if (audio.current === el) { setPlaying(false); setBuffering(false) } }
    const handlers = { playing: onPlay, waiting: onWait, loadedmetadata: onLoaded, timeupdate: onTime, ended: onEnd, error: onError }
    Object.entries(handlers).forEach(([name, handler]) => el.addEventListener(name, handler))
    cleanup.current = () => {
      Object.entries(handlers).forEach(([name, handler]) => el.removeEventListener(name, handler))
      el.pause()
    }
    setBuffering(true)
    el.play().catch(() => { if (audio.current === el) { setPlaying(false); setBuffering(false) } })
  }, [setView, stop, updateMediaSession])

  const playSingleAyah = useCallback((ayah: Ayah, selectedReciter: QuranAudioReciter, surahNumber: number) => {
    playAt(0, [ayah], selectedReciter, surahNumber, false, false)
  }, [playAt])

  const playConnected = useCallback((index: number, list: Ayah[], selectedReciter: QuranAudioReciter, surahNumber: number, withBismillah = false) => {
    playAt(index, list, selectedReciter, surahNumber, withBismillah, true)
  }, [playAt])

  const toggleCurrent = useCallback(() => {
    const el = audio.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
      setBuffering(false)
      return
    }
    setBuffering(true)
    void el.play().catch(() => {
      setPlaying(false)
      setBuffering(false)
    })
  }, [playing])

  const toggle = useCallback((list: Ayah[], selectedReciter: QuranAudioReciter, surahNumber: number, startIndex: number, withBismillah = false) => {
    if (playing) {
      audio.current?.pause()
      setPlaying(false)
      return
    }
    if (audio.current?.src) {
      setBuffering(true)
      audio.current.play().catch(() => { setPlaying(false); setBuffering(false) })
      return
    }
    playConnected(startIndex, list, selectedReciter, surahNumber, withBismillah)
  }, [playConnected, playing])

  useEffect(() => { repeatRef.current = repeat }, [repeat])

  // Inside the Android shell, keep a native foreground MediaSession service
  // alive while recitation plays, so the audio survives backgrounding.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (playing) {
      void (async () => {
        try {
          const { BackgroundAudio } = await import('@muslim/background-audio')
          await BackgroundAudio.start({ title: 'تلاوة القرآن', artist: QURAN_AUDIO_RECITER_LABELS[reciter] || reciter })
        } catch {}
      })()
    } else {
      void stopBackgroundAudio()
    }
  }, [playing, reciter, stopBackgroundAudio])

  const selectAyah = useCallback((ayahNumber: number, surahNumber: number) => { setCurrent(ayahNumber); setCurrentSurah(surahNumber) }, [])
  const setReciter = useCallback(async (next: QuranAudioReciter) => {
    setReciterState(next)
    const session = sessionRef.current
    const activeAudio = audio.current
    if (!session || !activeAudio || session.reciter === next) return

    const requestId = ++reciterSwitchRef.current
    const ayah = session.list[session.index]
    if (!ayah) return
    const source = session.list.length > 1 ? quranSurahAudioUrl(next, session.surah) : quranAudioUrl(next, ayah.number, session.bismillah)

    try {
      const preload = new Audio()
      preload.preload = 'auto'
      preload.src = source
      await new Promise<void>((resolve, reject) => {
        if (preload.readyState >= 3) {
          resolve()
          return
        }
        const onReady = () => {
          cleanupPreload()
          resolve()
        }
        const onError = () => {
          cleanupPreload()
          reject(new Error('reciter preload failed'))
        }
        const cleanupPreload = () => {
          preload.removeEventListener('canplaythrough', onReady)
          preload.removeEventListener('canplay', onReady)
          preload.removeEventListener('error', onError)
        }
        preload.addEventListener('canplaythrough', onReady, { once: true })
        preload.addEventListener('canplay', onReady, { once: true })
        preload.addEventListener('error', onError, { once: true })
      })
      preload.pause()
      if (requestId !== reciterSwitchRef.current || sessionRef.current !== session || audio.current !== activeAudio) return
      playAt(session.index, session.list, next, session.surah, session.bismillah, session.list.length > 1)
    } catch {
      if (requestId === reciterSwitchRef.current) setReciterState(session.reciter)
    }
  }, [playAt])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.setActionHandler('play', () => { if (audio.current) void audio.current.play().catch(() => {}) })
      navigator.mediaSession.setActionHandler('pause', () => { audio.current?.pause(); setPlaying(false); setBuffering(false) })
    } catch {}
    return () => {
      if (!('mediaSession' in navigator)) return
      try {
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
        navigator.mediaSession.metadata = null
        navigator.mediaSession.playbackState = 'none'
      } catch {}
    }
  }, [playAt])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    try { navigator.mediaSession.playbackState = playing ? 'playing' : 'paused' } catch {}
  }, [playing])

  useEffect(() => () => stop(), [stop])

  return (
    <QuranAudioContext.Provider value={{ reciter, current, currentSurah, playing, buffering, audioProgress, audioDuration, playback, audio: audio.current, playSingleAyah, playConnected, toggleCurrent, toggle, stop, repeat, setRepeat, selectAyah, setReciter }}>
      {children}
    </QuranAudioContext.Provider>
  )
}

export function useQuranAudio() {
  const context = useContext(QuranAudioContext)
  if (!context) throw new Error('useQuranAudio must be used inside QuranAudioProvider')
  return context
}
