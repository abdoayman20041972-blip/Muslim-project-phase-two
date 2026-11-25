import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import { useQuranAudio } from '../quran/QuranAudioProvider'
import type { RadioStation } from './radioData'
import { onQuranStarted, setRadioActive } from './audioOwner'

export type RadioStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

let audioPlugin: Promise<typeof import('@muslim/background-audio')> | undefined
const loadAudioPlugin = () => (audioPlugin ??= import('@muslim/background-audio').catch((error) => { audioPlugin = undefined; throw error }))

export const RADIO_ARTIST = 'إذاعة القرآن الكريم · بث مباشر'

function useRadioValue() {
  const { stop: stopQuran, currentSurah } = useQuranAudio()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [station, setStation] = useState<RadioStation | null>(null)
  const [status, setStatus] = useState<RadioStatus>('idle')
  const stationRef = useRef<RadioStation | null>(null)
  const nativeQueue = useRef<Promise<void>>(Promise.resolve())
  const pausedByFocus = useRef(false)

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio()
      audio.preload = 'none'
      audioRef.current = audio
    }
    return audioRef.current
  }, [])

  const begin = useCallback((url: string) => {
    const audio = getAudio()
    audio.src = url
    setStatus('loading')
    audio.play().catch(() => { /* The error event decides what happens next. */ })
  }, [getAudio])

  const play = useCallback((next: RadioStation) => {
    // Quran recitation and radio never play together.
    if (currentSurah !== null) stopQuran()
    stationRef.current = next
    setStation(next)
    setRadioActive(true)
    begin(next.url)
  }, [begin, currentSurah, stopQuran])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load() }
    stationRef.current = null
    setStation(null)
    setStatus('idle')
    setRadioActive(false)
  }, [])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    const current = stationRef.current
    if (!audio || !current) return
    if (status === 'playing' || status === 'loading') {
      audio.pause()
      setStatus('paused')
    } else {
      // A live stream has no position to resume: reload it so the listener hears the present.
      begin(current.url)
    }
  }, [begin, status])

  useEffect(() => {
    const audio = getAudio()
    const onPlaying = () => setStatus('playing')
    const onWaiting = () => { if (stationRef.current && !audio.paused) setStatus('loading') }
    const onError = () => {
      if (!stationRef.current) return
      setStatus('error')
    }
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('error', onError)
      audio.pause()
      setRadioActive(false)
    }
  }, [begin, getAudio])

  // Quran playback started: radio steps aside.
  useEffect(() => onQuranStarted(() => { if (stationRef.current) stop() }), [stop])

  const serviceNeeded = !!station && (status === 'loading' || status === 'playing' || status === 'paused')
  const active = status === 'playing' || status === 'loading'
  const title = station?.name ?? ''
  const notificationAsked = useRef(false)
  const hadService = useRef(false)
  const currentSurahRef = useRef(currentSurah)
  currentSurahRef.current = currentSurah
  const [notificationWarning, setNotificationWarning] = useState<string | null>(null)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let current = true
    nativeQueue.current = nativeQueue.current.catch(() => {}).then(async () => {
      if (!current) return
      try {
        const { BackgroundAudio } = await loadAudioPlugin()
        if (!current) return
        if (serviceNeeded) {
          hadService.current = true
          await BackgroundAudio.start({ title, artist: RADIO_ARTIST, playing: active, live: true })
          if (!notificationAsked.current) {
            notificationAsked.current = true
            const permission = await BackgroundAudio.requestNotificationPermission()
            if (!permission.granted) setNotificationWarning('الإشعارات مغلقة، فلن تظهر أزرار التحكم في الإشعار وشاشة القفل. فعّلها من إعدادات التطبيق.')
            else if (current) await BackgroundAudio.start({ title, artist: RADIO_ARTIST, playing: active, live: true })
          }
        } else if (hadService.current) {
          // Radio itself ended. Quran playback manages its own session, so leave it alone.
          hadService.current = false
          if (!currentSurahRef.current) await BackgroundAudio.stop()
        }
      } catch { /* The screen shows the stream state; the notification is best-effort. */ }
    })
    return () => { current = false }
  }, [serviceNeeded, active, title])

  // Notification buttons and audio focus.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let remove: (() => Promise<void>) | undefined
    let disposed = false
    void loadAudioPlugin().then(async ({ BackgroundAudio }) => {
      const handle = await BackgroundAudio.addListener('mediaAction', ({ action }) => {
        if (!stationRef.current) return
        const audio = audioRef.current
        const running = !!audio && !audio.paused
        switch (action) {
          case 'play': pausedByFocus.current = false; if (!running) toggle(); break
          case 'pause': pausedByFocus.current = false; if (running) toggle(); break
          case 'stop': pausedByFocus.current = false; stop(); break
          case 'focusLossTransient': if (running) { pausedByFocus.current = true; toggle() } break
          case 'focusLoss': case 'noisy': pausedByFocus.current = false; if (running) toggle(); break
          case 'focusGain': if (pausedByFocus.current) { pausedByFocus.current = false; toggle() } break
        }
      })
      if (disposed) void handle.remove(); else remove = handle.remove
    }).catch(() => { /* Background service unavailable. */ })
    return () => { disposed = true; void remove?.() }
  }, [toggle, stop])

  return useMemo(() => ({ station, status, play, toggle, stop, notificationWarning }), [station, status, play, toggle, stop, notificationWarning])
}

const RadioContext = createContext<ReturnType<typeof useRadioValue> | null>(null)
export function RadioProvider({ children }: { children: ReactNode }) {
  const value = useRadioValue()
  return <RadioContext.Provider value={value}>{children}</RadioContext.Provider>
}
export function useRadio() {
  const context = useContext(RadioContext)
  if (!context) throw new Error('useRadio must be used inside RadioProvider')
  return context
}
