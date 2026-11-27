import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Loader2, RotateCcw } from 'lucide-react'
import { BackButton } from '../../components/app-chrome'

/** Channel names and playlist URLs come from the mp3quran live-tv API (https://www.mp3quran.net/api/v3/live-tv). */
const CHANNELS = [
  { id: 3, name: 'قناة القرآن الكريم', url: 'https://win.holol.com/live/quran/playlist.m3u8' },
  { id: 4, name: 'قناة السنة النبوية', url: 'https://win.holol.com/live/sunnah/playlist.m3u8' },
] as const

type Status = 'loading' | 'playing' | 'error'

/** Live video with sound. hls.js plays the HLS stream through Media Source Extensions; native HLS is the fallback. */
export function HaramLiveView({ onBack }: { onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>(CHANNELS[0])
  const [status, setStatus] = useState<Status>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    let hls: { destroy: () => void } | null = null
    let retried = false
    setStatus('loading')
    const fail = () => { if (!cancelled) setStatus('error') }
    const onPlaying = () => { if (!cancelled) setStatus('playing') }
    video.addEventListener('playing', onPlaying)
    video.addEventListener('loadeddata', onPlaying)
    ;(async () => {
      try {
        const { default: Hls } = await import('hls.js')
        if (cancelled) return
        if (Hls.isSupported()) {
          const instance = new Hls({ lowLatencyMode: false })
          hls = instance
          instance.on(Hls.Events.ERROR, (_e, data) => {
            if (!data.fatal) return
            if (!retried) {
              retried = true
              if (data.type === Hls.ErrorTypes.MEDIA_ERROR) instance.recoverMediaError()
              else instance.startLoad()
              return
            }
            fail()
          })
          instance.loadSource(channel.url)
          instance.attachMedia(video)
          instance.on(Hls.Events.MANIFEST_PARSED, () => { void video.play().catch(() => { /* needs a tap: the controls stay visible */ }) })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = channel.url
          void video.play().catch(() => {})
          video.addEventListener('error', fail, { once: true })
        } else fail()
      } catch { fail() }
    })()
    return () => {
      cancelled = true
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('loadeddata', onPlaying)
      hls?.destroy()
      video.removeAttribute('src')
      video.load()
    }
  }, [channel, attempt])

  const pick = useCallback((c: (typeof CHANNELS)[number]) => { setChannel(c); setAttempt(0) }, [])

  return (
    <div className="haram-live w-full min-w-0" data-testid="haram-live">
      <div className="flex items-center justify-between">
        <h1 className="font-cairo text-[1.75rem] font-bold text-azkar-teal-ink">البث المباشر</h1>
        <BackButton onClick={onBack} overlay />
      </div>
      <div className="haram-live-stage mt-4">
        <video ref={videoRef} className="haram-live-video" playsInline controls aria-label={channel.name} />
        {status === 'loading' && <div className="haram-live-overlay" role="status"><Loader2 className="h-7 w-7 animate-spin" /><span>جارٍ الاتصال بالبث…</span></div>}
        {status === 'error' && (
          <div className="haram-live-overlay" role="alert">
            <span>تعذر تشغيل البث الآن</span>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="haram-live-retry"><RotateCcw className="h-4 w-4" />إعادة المحاولة</button>
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-2" role="tablist" aria-label="قناة البث">
        {CHANNELS.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={c.id === channel.id} onClick={() => pick(c)} className={`haram-live-tab ${c.id === channel.id ? 'is-active' : ''}`}>{c.name}</button>
        ))}
      </div>
      <p className="mt-3 text-[0.75rem] font-semibold text-azkar-ink-soft">البث بالفيديو يستهلك بيانات الإنترنت، حوالي ٤٠٠ ميجابايت في الساعة. المصدر: قائمة البث المباشر في mp3quran.net.</p>
    </div>
  )
}
