import { useEffect, useRef, useState } from 'react'
import { BookOpen, ChevronLeft, Compass, Moon, ScrollText, Settings, Sun, Sparkles, BookMarked, CircleDot } from 'lucide-react'
import { formatLocalizedDate, toArabicNumber } from '../../constants'
import { formatCountdown, formatPrayerTime, PRAYER_LABELS, useNextPrayer, usePrayerCoords } from '../prayer/prayerTimes'
import { APP_SETTINGS_KEYS, readSetting, writeSetting } from '../../settings'
import { dailyAyahDateKey, dailyAyahFor, dailyAyahIndex } from '../../../daily-ayahs'
import { DailyAyahCard } from './DailyAyahCard'
import { PRAYER_PHOTOS } from './prayerPhotos'
import { useHomeProgress, type WirdProgress } from './useHomeProgress'
import { readingPositionLabel } from '../quran/readingPosition'
import { wirdForPrayerTimes } from '../azkar/azkarProgress'

const HOME_HERO_IMAGE = '/img/home-mosque-hero.jpg'

export type HomeViewProps = {
  lastSurahMeta?: { number: number; shortName: string }
  onOpenPrayer: () => void
  onOpenMushaf: () => void
  onOpenAzkar: () => void
  onOpenMorningAzkar?: () => void
  onOpenEveningAzkar?: () => void
  onOpenTasbih: () => void
  onContinueReading: () => void
  darkMode?: boolean
  onToggleDarkMode?: () => void
  onOpenSettings?: () => void
  onOpenQibla?: () => void
  onOpenProphets?: () => void
  onOpenHadith?: () => void
  onOpenFavorites?: () => void
  onOpenMore?: () => void
  onOpenSurah?: (surah: number) => void
}

export type TileTone = 'quran' | 'tasbih' | 'prayer' | 'azkar' | 'qibla' | 'prophets' | 'hadith' | 'more'

export function HomeTile({
  onClick,
  title,
  subtitle,
  icon,
  tone,
  delay = 0,
  reveal = true,
}: {
  onClick: () => void
  title: string
  subtitle: string
  icon: React.ReactNode
  tone: TileTone
  delay?: number
  reveal?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={title}
      {...(reveal ? { 'data-reveal': true } : {})}
      style={{ ['--reveal-delay' as string]: `${delay * 60}ms` }}
      className={`home-reference-tile home-reference-tile-${tone} u-pressable group relative min-h-[8.4rem] overflow-hidden rounded-[1.35rem] border p-4 text-right u-shadow-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold`}
    >
      <span className="home-tile-scrim" aria-hidden="true" />
      <span className="home-tile-shape home-tile-shape-a" aria-hidden="true" />
      <span className="home-tile-shape home-tile-shape-b" aria-hidden="true" />
      <span className="home-tile-icon relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/10 backdrop-blur-sm">
        {icon}
      </span>
      <span className="relative z-10 mt-9 block">
        <span className="block font-cairo text-[1.125rem] font-bold leading-none text-white">{title}</span>
        <span className="mt-1.5 block text-[0.6875rem] font-semibold text-white">{subtitle}</span>
      </span>
      <span className="home-tile-arrow absolute bottom-2.5 left-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/10 text-white backdrop-blur-sm">
        <ChevronLeft className="h-4 w-4" />
      </span>
    </button>
  )
}

function QuickTool({ onClick, title, icon, tone, ariaLabel }: { onClick: () => void; title: string; icon: React.ReactNode; tone: string; ariaLabel?: string }) {
  return (
    <button onClick={onClick} aria-label={ariaLabel || title} className="u-pressable flex min-w-[4.2rem] flex-col items-center gap-1.5 text-center">
      <span className={`home-quick-icon ${tone} flex h-12 w-12 items-center justify-center rounded-full`}>{icon}</span>
      <span className="home-quick-label whitespace-nowrap text-[0.6875rem] font-bold text-azkar-ink">{title}</span>
    </button>
  )
}

export function HomeView({
  lastSurahMeta,
  darkMode = false,
  onToggleDarkMode = () => {},
  onOpenPrayer,
  onOpenMushaf,
  onOpenAzkar,
  onOpenMorningAzkar,
  onOpenEveningAzkar,
  onOpenTasbih,
  onContinueReading,
  onOpenQibla = () => {},
  onOpenSettings = () => {},
  onOpenProphets = () => {},
  onOpenHadith = () => {},
  onOpenSurah,
}: HomeViewProps) {
  const [dateTick, setDateTick] = useState(() => new Date())
  const [dailyAyah, setDailyAyah] = useState(() => dailyAyahFor(new Date()))

  useEffect(() => {
    const tick = () => setDateTick(new Date())
    const id = window.setInterval(tick, 60000)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  const pageRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const page = pageRef.current
    const elements = Array.from((page ?? document).querySelectorAll<HTMLElement>('[data-reveal]'))
    const reducedOs = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const revealInViewport = () => {
      if (typeof window === 'undefined') return
      for (const el of elements) {
        if (el.classList.contains('reveal-in')) continue
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight * 0.94 && rect.bottom > 0) el.classList.add('reveal-in')
      }
    }
    const hasIO = 'IntersectionObserver' in window
    const observer = hasIO
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                entry.target.classList.add('reveal-in')
                observer!.unobserve(entry.target)
              }
            }
          },
          { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
        )
      : null
    const watch = () => {
      if (!observer) return
      for (const el of elements) if (!el.classList.contains('reveal-in')) observer.observe(el)
    }
    // Replays the entrance: used when the splash finishes and each time Home becomes visible again,
    // because Home stays mounted while other tabs are open. Reduced motion (OS or app) skips the replay.
    const replay = () => {
      if (reducedOs() || document.documentElement.classList.contains('reduce-motion')) return
      observer?.disconnect()
      for (const el of elements) {
        el.style.transition = 'none'
        el.classList.remove('reveal-in')
      }
      void document.body.offsetHeight
      for (const el of elements) el.style.removeProperty('transition')
      window.setTimeout(() => {
        revealInViewport()
        watch()
      }, 60)
    }
    const raf = requestAnimationFrame(() => requestAnimationFrame(revealInViewport))
    watch()
    const fallback = window.setTimeout(revealInViewport, 900)
    const onSplashDone = () => replay()
    window.addEventListener('muslim-splash-done', onSplashDone)
    let visibility: IntersectionObserver | null = null
    let wasVisible = true
    if (hasIO && page) {
      visibility = new IntersectionObserver((entries) => {
        const visible = entries.some((e) => e.isIntersecting)
        if (visible && !wasVisible) replay()
        wasVisible = visible
      })
      visibility.observe(page)
    }
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(fallback)
      window.removeEventListener('muslim-splash-done', onSplashDone)
      observer?.disconnect()
      visibility?.disconnect()
    }
  }, [])

  const headerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    // The prayer card rises over the header: the header stays pinned behind it and fades as the card covers it.
    const header = headerRef.current
    if (!header) return
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const update = () => {
      frame = 0
      // Header stays pinned and untouched while the prayer card slides up over it; it only fades once fully covered.
      const covered = header.offsetHeight + 8
      const p = Math.min(1, Math.max(0, (window.scrollY - covered) / 40))
      header.style.opacity = String(1 - p)
      header.style.pointerEvents = window.scrollY > header.offsetHeight * 0.5 ? 'none' : ''
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const syncDailyAyah = () => {
      const d = new Date()
      setDailyAyah(dailyAyahFor(d))
      writeSetting('azkar_daily_ayah', JSON.stringify({ date: dailyAyahDateKey(d), index: dailyAyahIndex(d) }))
    }
    syncDailyAyah()
    const timer = window.setInterval(syncDailyAyah, 60000)
    window.addEventListener('focus', syncDailyAyah)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', syncDailyAyah)
    }
  }, [])

  const gregorianDate = formatLocalizedDate(dateTick, { day: 'numeric', month: 'long', year: 'numeric' }, 'ar-EG')
  const weekdayName = formatLocalizedDate(dateTick, { weekday: 'long' }, 'ar-EG')
  const hijriDate = readSetting(APP_SETTINGS_KEYS.hijriCalendar, '1') !== '0'
    ? formatLocalizedDate(dateTick, { day: 'numeric', month: 'long', year: 'numeric' }, 'ar-SA-u-ca-islamic-umalqura')
    : ''
  const coords = usePrayerCoords()
  const { next, remainingMs, timings, loading: prayerLoading, error: prayerError } = useNextPrayer(coords)
  const timedAzkar = wirdForPrayerTimes(timings, dateTick)
  const locationLabel = getNearestCityLabel(coords)

  const progress = useHomeProgress()
  const photoKey = next?.key ?? 'Fajr'
  const photo = PRAYER_PHOTOS[photoKey]
  const [photoSrc, setPhotoSrc] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    setPhotoSrc(null)
    photo.load().then((src) => { if (live) setPhotoSrc(src) }).catch(() => { if (live) setPhotoSrc(null) })
    return () => { live = false }
  }, [photo])
  const hour = dateTick.getHours()
  const greeting = hour >= 5 && hour < 12 ? 'صباح الخير' : hour >= 12 && hour < 18 ? 'نهارك سعيد' : 'مساء الخير'
  const readingLabel = lastSurahMeta ? readingPositionLabel(progress.reading?.surah === lastSurahMeta.number ? progress.reading : null, toArabicNumber) : null

  return (
    <div ref={pageRef} className="home-reference-page home-v4 relative w-full min-w-0 pb-6">
      <div className="home-bg" aria-hidden="true">
        <div className="home-bg-image" style={{ backgroundImage: `url("${HOME_HERO_IMAGE}")` }} />
        <div className="home-bg-fade" />
      </div>
      <main className="home-reference-content mx-auto w-full max-w-md px-3.5">
        <header ref={headerRef} className="home-rise-header flex items-center justify-between pb-5 pt-[max(.8rem,env(safe-area-inset-top))]">
          <div className="text-right" data-reveal>
            <div className="text-[0.8125rem] font-semibold text-azkar-ink-soft">{greeting}</div>
            <div className="home-weekday font-cairo text-[1.5rem] font-bold leading-tight text-azkar-teal-ink">{weekdayName}</div>
            <div className="home-date-line flex flex-wrap items-baseline gap-x-2 font-semibold text-azkar-gold-deep">
              <span className="text-[0.8125rem] text-azkar-teal-ink">{gregorianDate}</span>
              {hijriDate && <span className="text-[0.75rem]">{hijriDate}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onToggleDarkMode} aria-label="تبديل الوضع الليلي" className="home-v4-round u-pressable">
              {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <button onClick={onOpenSettings} aria-label="الإعدادات" className="home-v4-round u-pressable">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        <section className="home-prayer-photo home-rise-card" data-testid="home-prayer-photo" data-reveal>
          <div className="home-prayer-photo-img" style={photoSrc ? { backgroundImage: `url("${photoSrc}")` } : undefined} aria-hidden="true" />
          <div className="home-prayer-photo-shade" aria-hidden="true" />
          <button type="button" onClick={onOpenPrayer} aria-label="مواقيت الصلاة" className="absolute inset-0 z-[5] h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold" />
          <div className="home-prayer-sky" aria-hidden="true">
            <span className="home-sky-star home-sky-star-a" />
            <span className="home-sky-star home-sky-star-b" />
            <span className="home-sky-star home-sky-star-c" />
            <span className="home-sky-glow" />
          </div>
          <div className="home-prayer-top pointer-events-none relative z-10 flex items-baseline justify-between px-4">
            <span className="text-[0.8125rem] font-semibold text-white/85">{next ? 'الصلاة القادمة' : 'مواقيت الصلاة'}</span>
            <span className="home-reference-location"><Compass className="h-4 w-4" /><span>{locationLabel}</span></span>
          </div>
          <div className="pointer-events-none relative z-10 flex items-end justify-between pb-3 pt-2">
            <div className="home-prayer-name-block text-center">
              <div className="font-cairo text-[1.9rem] font-bold leading-none text-white">{next ? PRAYER_LABELS[next.key] : '—'}</div>
              <div className="mt-1 text-[1.05rem] font-bold tabular-nums leading-none text-white/90">{next && timings?.[next.key] ? formatPrayerTime(timings[next.key]) : '—:—'}</div>
            </div>
            <div className="home-prayer-remaining-block text-center">
              <div className="text-[0.75rem] font-semibold leading-none text-white/80">متبقي</div>
              <div dir="ltr" className="mt-1 text-[1.3rem] font-bold tabular-nums leading-none text-white">{formatCountdown(remainingMs)}</div>
            </div>
          </div>
          <span className="sr-only" role="status">{next ? `الصلاة القادمة ${PRAYER_LABELS[next.key]}` : ''}</span>
          <div className="home-prayer-chips pointer-events-none relative z-10 mx-2.5 mb-1 grid grid-cols-5 gap-0.5 rounded-2xl p-1">
            {(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const).map((key) => {
              const active = next?.key === key
              const time = timings?.[key]
              return (
                <button key={key} onClick={onOpenPrayer} aria-label={`${PRAYER_LABELS[key]} ${time ? formatPrayerTime(time) : ''}`} className={`u-pressable pointer-events-auto flex min-w-0 flex-col items-center justify-center rounded-xl px-0.5 py-1 ${active ? 'home-prayer-chip-active' : 'text-white'}`}>
                  <span className="whitespace-nowrap text-[0.6875rem] font-bold">{PRAYER_LABELS[key]}</span>
                  <span className="mt-1 whitespace-nowrap text-[0.8125rem] font-bold tabular-nums">{time ? formatPrayerTime(time) : '—:—'}</span>
                </button>
              )
            })}
          </div>
          {!coords && <div className="pointer-events-none relative z-10 px-4 pb-1.5 text-center text-[0.6875rem] text-white/80">حدّد موقعك لعرض مواقيت الصلاة بدقة</div>}
          {coords && prayerLoading && !timings && <div role="status" className="pointer-events-none relative z-10 px-4 pb-1.5 text-center text-[0.6875rem] text-white/80">جارٍ حساب المواقيت…</div>}
          {coords && prayerError && !timings && <div role="alert" className="pointer-events-none relative z-10 px-4 pb-1.5 text-center text-[0.6875rem] text-white/80">تعذر تحميل المواقيت حاليًا</div>}
        </section>

        <div id="home-daily-ayah" className="mt-6" data-reveal>
          <DailyAyahCard ayah={dailyAyah} onOpenSurah={onOpenSurah} />
        </div>

        <section className="mt-7 grid grid-cols-2 gap-4" aria-label="الأقسام">
          <HomeTile onClick={onOpenMushaf} title="المصحف" subtitle="القرآن الكريم" tone="quran" icon={<BookOpen className="h-6 w-6" />} delay={0} />
          <HomeTile onClick={onOpenHadith} title="الأحاديث" subtitle="من السنة النبوية" tone="hadith" icon={<BookMarked className="h-6 w-6" />} delay={1} />
          <HomeTile onClick={onOpenAzkar} title="الأذكار" subtitle="أذكار اليوم والليلة" tone="azkar" icon={<Sparkles className="h-6 w-6" />} delay={2} />
          <HomeTile onClick={onOpenProphets} title="قصص الأنبياء" subtitle="دروس وعِبر" tone="prophets" icon={<ScrollText className="h-6 w-6" />} delay={3} />
          <HomeTile onClick={onOpenTasbih} title="السبحة" subtitle="تسبيح وذكر" tone="tasbih" icon={<CircleDot className="h-6 w-6" />} delay={4} />
          <HomeTile onClick={onOpenQibla} title="القبلة" subtitle="اتجاه الكعبة" tone="qibla" icon={<Compass className="h-6 w-6" />} delay={5} />
        </section>

        <section className="mt-6 grid grid-cols-3 gap-3" aria-label="تقدمك اليوم">
          <ProgressCard delay={0} onClick={lastSurahMeta ? onContinueReading : onOpenMushaf} title="تابع القراءة" ring={null} sub={lastSurahMeta ? [lastSurahMeta.shortName, readingLabel].filter(Boolean).join(' · ') : 'افتح المصحف'} icon={<BookOpen className="h-6 w-6" />} />
          <ProgressCard delay={1} onClick={onOpenEveningAzkar || onOpenAzkar} title="أذكار المساء" ring={progress.evening} sub={wirdSub(progress.evening)} />
          <ProgressCard delay={2} onClick={onOpenMorningAzkar || onOpenAzkar} title="أذكار الصباح" ring={progress.morning} sub={wirdSub(progress.morning)} />
        </section>
      </main>
    </div>
  )
}

function wirdSub(p: WirdProgress | null) {
  if (!p || p.total === 0) return 'افتح الأذكار'
  if (p.completed === 0) return 'لم تبدأ'
  if (p.completed >= p.total) return 'أكملتها اليوم'
  return `${toArabicNumber(p.completed)} من ${toArabicNumber(p.total)}`
}

function ProgressCard({ onClick, title, sub, ring, icon, delay = 0 }: { onClick: () => void; title: string; sub: string; ring: WirdProgress | null; icon?: React.ReactNode; delay?: number }) {
  const pct = ring && ring.total > 0 ? Math.min(100, Math.round((ring.completed / ring.total) * 100)) : 0
  return (
    <button onClick={onClick} aria-label={`${title}: ${sub}`} data-reveal style={{ ['--reveal-delay' as string]: `${delay * 60}ms` }} className="home-reference-quick home-progress-card u-pressable flex flex-col items-start rounded-[1.2rem] border border-white/60 p-3 text-right">
      {ring ? (
        <span className="home-progress-ring" style={{ ['--pct' as string]: `${pct}%` }} role="img" aria-label={`${toArabicNumber(pct)}٪`} />
      ) : (
        <span className="home-progress-icon flex items-center justify-center">{icon}</span>
      )}
      <span className="mt-2 block font-cairo text-[1rem] font-bold leading-tight text-azkar-teal-ink">{title}</span>
      <span className="mt-0.5 block text-[0.8125rem] font-semibold text-azkar-ink-soft">{sub}</span>
    </button>
  )
}

function getNearestCityLabel(coords: ReturnType<typeof usePrayerCoords>) {
  if (!coords) return 'تحديد الموقع'
  const cities = [
    ['شبين القناطر', 30.3127, 31.3202],
    ['القاهرة', 30.0444, 31.2357],
    ['الجيزة', 30.0131, 31.2089],
    ['المنصورة', 31.0409, 31.3785],
    ['الإسكندرية', 31.2001, 29.9187],
  ] as const
  let nearest: (typeof cities)[number] = cities[0]
  let distance = Number.POSITIVE_INFINITY
  for (const city of cities) {
    const d = Math.hypot(coords.lat - city[1], coords.lng - city[2])
    if (d < distance) {
      nearest = city
      distance = d
    }
  }
  return nearest[0]
    }
