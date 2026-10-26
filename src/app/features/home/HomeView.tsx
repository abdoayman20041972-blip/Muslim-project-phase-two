import { useEffect, useState } from 'react'
import { BookOpen, ChevronLeft, CircleDot, Compass, Heart, Moon, MoreHorizontal, ScrollText, Settings, Sparkles, Sun } from 'lucide-react'
import { formatLocalizedDate, toArabicNumber } from '../../constants'
import { formatCountdown, formatPrayerTime, PRAYER_LABELS, useNextPrayer, usePrayerCoords } from '../prayer/prayerTimes'
import { APP_SETTINGS_KEYS, readSetting, writeSetting } from '../../settings'
import { dailyAyahDateKey, dailyAyahFor, dailyAyahIndex } from '../../../daily-ayahs'
import { timeBasedAzkar } from '../azkar/azkarProgress'

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
}

type TileTone = 'quran' | 'tasbih' | 'prayer' | 'azkar' | 'qibla' | 'prophets' | 'hadith' | 'more'

function HomeTile({
  onClick,
  title,
  subtitle,
  icon,
  tone,
  delay = 0,
}: {
  onClick: () => void
  title: string
  subtitle: string
  icon: React.ReactNode
  tone: TileTone
  delay?: number
}) {
  return (
    <button
      onClick={onClick}
      aria-label={title}
      data-reveal
      style={{ ['--reveal-delay' as string]: `${delay * 60}ms` }}
      className={`home-reference-tile home-reference-tile-${tone} u-pressable group relative min-h-[7.6rem] overflow-hidden rounded-[1.35rem] border p-3.5 text-right u-shadow-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold`}
    >
      <span className="home-tile-shape home-tile-shape-a" aria-hidden="true" />
      <span className="home-tile-shape home-tile-shape-b" aria-hidden="true" />
      <span className="home-tile-icon relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/10 backdrop-blur-sm">
        {icon}
      </span>
      <span className="relative z-10 mt-7 block">
        <span className="block font-amiri text-[18px] font-bold leading-none text-white">{title}</span>
        <span className="mt-1.5 block text-[10px] font-semibold text-white/80">{subtitle}</span>
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
      <span className="home-quick-label whitespace-nowrap text-[9px] font-bold text-azkar-ink">{title}</span>
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
  onOpenSettings = () => {},
  onOpenQibla = () => {},
  onOpenProphets = () => {},
  onOpenHadith = () => {},
  onOpenFavorites = () => {},
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

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    const revealInViewport = () => {
      for (const el of elements) {
        if (el.classList.contains('reveal-in')) continue
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight * 0.94 && rect.bottom > 0) el.classList.add('reveal-in')
      }
    }
    const raf = requestAnimationFrame(() => requestAnimationFrame(revealInViewport))
    if (!('IntersectionObserver' in window)) {
      revealInViewport()
      return () => cancelAnimationFrame(raf)
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-in')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    elements.forEach((el) => observer.observe(el))
    const fallback = window.setTimeout(revealInViewport, 900)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(fallback)
      observer.disconnect()
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

  const gregorianDate = formatLocalizedDate(dateTick, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, 'ar-EG')
  const hijriDate = readSetting(APP_SETTINGS_KEYS.hijriCalendar, '1') !== '0'
    ? formatLocalizedDate(dateTick, { day: 'numeric', month: 'long', year: 'numeric' }, 'ar-SA-u-ca-islamic-umalqura')
    : ''
  const timedAzkar = timeBasedAzkar(dateTick)
  const coords = usePrayerCoords()
  const { next, remainingMs, timings, loading: prayerLoading, error: prayerError } = useNextPrayer(coords)
  const locationLabel = getNearestCityLabel(coords)

  return (
    <div className="home-reference-page relative w-full min-w-0 pb-2">
      <section className="home-reference-hero">
        <div className="home-reference-hero-image" style={{ backgroundImage: `url("${HOME_HERO_IMAGE}")` }} aria-hidden="true" />
        <div className="home-reference-hero-overlay" aria-hidden="true" />
        <div className="home-reference-ornament home-reference-ornament-one" aria-hidden="true" />
        <div className="home-reference-ornament home-reference-ornament-two" aria-hidden="true" />

        <header className="relative z-20 mx-auto flex w-full max-w-md items-start justify-between px-4 pt-[max(.55rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <button aria-label="الموقع الحالي" className="home-reference-location u-pressable">
              <span>{locationLabel}</span>
              <Compass className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onToggleDarkMode} aria-label="تبديل الوضع الليلي" className="home-reference-round-button u-pressable">
              {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <button onClick={onOpenSettings} aria-label="الإعدادات" className="home-reference-round-button u-pressable">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="relative z-10 mx-auto mt-3 flex w-full max-w-md flex-col items-center px-5 text-center">
          <div className="home-reference-brand" data-reveal>
            <div className="relative -top-1 font-amiri text-[3.15rem] font-bold leading-[.85] text-white drop-shadow-lg">مسلم</div>
            <div className="mt-2.5 font-amiri text-[1.2rem] font-semibold text-white/90">ذكرٌ، صلاةٌ، وحياةٌ أجمل</div>
          </div>
          <div className="home-reference-date mt-2.5 w-fit rounded-[1.25rem] border border-white/20 bg-black/25 px-4 py-2.5 text-center text-white backdrop-blur-md">
            <div className="font-amiri text-[15px] font-bold">{gregorianDate}</div>
            {hijriDate && <div className="mt-0.5 text-[11px] text-white/85">{hijriDate}</div>}
          </div>
        </div>

        <div id="home-daily-ayah" className="relative z-10 mx-auto mt-5 w-full max-w-md px-4" data-reveal>
          <div className="home-reference-ayah rounded-[1.5rem] border border-white/60 bg-white/85 px-5 py-3.5 text-center shadow-2xl backdrop-blur-md">
            <div className="home-ayah-ornament" aria-hidden="true">❧</div>
            <div className="font-amiri text-[24px] font-bold leading-[1.8] text-[#173c35]">{dailyAyah.text}</div>
            <div className="mt-1 text-[10px] font-semibold text-[#4c5e58]">سورة {dailyAyah.surah} — آية {toArabicNumber(dailyAyah.number)}</div>
          </div>
          <div className="home-ayah-divider mt-2.5" aria-hidden="true" />
        </div>
      </section>

      <main className="home-reference-content mx-auto w-full max-w-md px-3.5">
        <section className="home-reference-prayer -mt-1 mb-3 overflow-hidden rounded-[1.45rem] border border-white/20 bg-[#062f2a]/95 text-white shadow-2xl backdrop-blur-md" data-reveal>
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="home-reference-prayer-mark flex h-8 w-8 items-center justify-center rounded-full bg-[#e9c875]/10"><img className="h-6 w-6 object-contain opacity-90" src="/img/mosque-prayer-times-icon.png" alt="" aria-hidden="true" /></span>
              <h2 className="font-amiri text-[20px] font-bold">مواقيت الصلاة</h2>
            </div>
          </div>
          <div className="home-reference-prayer-body grid grid-cols-[1.28fr_2.72fr] gap-1 px-2.5 py-2.5">
            <div className="flex min-w-0 flex-col items-center justify-center border-l border-white/15 px-1.5 text-center">
              <span className="text-[9px] text-[#e9c875]">الوقت المتبقي على</span>
              <span className="mt-0.5 font-amiri text-[16px] font-bold">{next ? PRAYER_LABELS[next.key] : 'الصلاة القادمة'}</span>
              <span dir="ltr" className="mt-1 text-[20px] font-bold tabular-nums tracking-tight">{formatCountdown(remainingMs)}</span>
            </div>
            <div className="grid min-w-0 grid-cols-5 gap-0.5">
              {(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const).map((key) => {
                const active = next?.key === key
                const time = timings?.[key]
                return (
                  <button key={key} onClick={onOpenPrayer} aria-label={`${PRAYER_LABELS[key]} ${time ? formatPrayerTime(time) : ''}`} className={`u-pressable flex min-w-0 flex-col items-center justify-center rounded-xl px-0.5 py-1.5 ${active ? 'bg-[#159d8a] shadow-inner' : 'bg-white/0'}`}>
                    <span className="whitespace-nowrap text-[8px] font-bold">{PRAYER_LABELS[key]}</span>
                    <span className="mt-1.5 text-base leading-none">{key === 'Fajr' ? '☁' : key === 'Dhuhr' ? '☀' : key === 'Asr' ? '◉' : key === 'Maghrib' ? '◉' : '☾'}</span>
                    <span className="mt-1 whitespace-nowrap text-[9px] font-bold tabular-nums">{time ? formatPrayerTime(time) : '—:—'}</span>
                  </button>
                )
              })}
            </div>
          </div>
          {!coords && <div className="px-4 pb-2.5 text-center text-[9px] text-white/60">حدّد موقعك لعرض مواقيت الصلاة بدقة</div>}
          {coords && prayerLoading && !timings && <div className="px-4 pb-2.5 text-center text-[9px] text-white/60">جارٍ حساب المواقيت…</div>}
          {coords && prayerError && !timings && <div className="px-4 pb-2.5 text-center text-[9px] text-white/60">تعذر تحميل المواقيت حاليًا</div>}
        </section>

        <section className="grid grid-cols-2 gap-2.5" data-reveal>
          <HomeTile onClick={onOpenMushaf} title="المصحف" subtitle="قراءة القرآن الكريم" tone="quran" icon={<BookOpen className="h-6 w-6" />} delay={0} />
          <HomeTile onClick={onOpenTasbih} title="السبحة" subtitle="تسبيح وذكر" tone="tasbih" icon={<CircleDot className="h-6 w-6" />} delay={1} />
          <HomeTile onClick={onOpenHadith} title="الأحاديث" subtitle="أحاديث نبوية مختارة" tone="hadith" icon={<BookOpen className="h-6 w-6" />} delay={2} />
          <HomeTile onClick={onOpenAzkar} title="الأذكار" subtitle={timedAzkar.subtitle || 'أذكار اليوم والصلوات'} tone="azkar" icon={<Sparkles className="h-6 w-6" />} delay={4} />
          <HomeTile onClick={onOpenQibla} title="القبلة" subtitle="تحديد اتجاه القبلة" tone="qibla" icon={<Compass className="h-6 w-6" />} delay={5} />
          <HomeTile onClick={onOpenProphets} title="قصص الأنبياء" subtitle="دروس وعِبر" tone="prophets" icon={<ScrollText className="h-6 w-6" />} delay={6} />
          <HomeTile onClick={() => {}} title="المزيد" subtitle="قريبًا" tone="more" icon={<MoreHorizontal className="h-6 w-6" />} delay={7} />
        </section>

        <section className="home-reference-quick mt-2.5 rounded-[1.5rem] border border-black/5 bg-white/55 px-3 py-4 shadow-sm backdrop-blur-md" data-reveal>
          <div className="mb-3 text-right font-amiri text-[20px] font-bold text-azkar-teal-ink">أدوات سريعة</div>
          <div className="grid grid-cols-4 gap-1">
            <QuickTool onClick={lastSurahMeta ? onContinueReading : onOpenMushaf} title={lastSurahMeta ? 'متابعة القراءة' : 'فتح المصحف'} tone="slate" icon={<CircleDot className="h-5 w-5" />} />
            <QuickTool onClick={onOpenFavorites} title="المفضلة" tone="rose" icon={<Heart className="h-5 w-5" />} />
            <QuickTool onClick={onOpenMorningAzkar || onOpenAzkar} title="أذكار الصباح" tone="amber" icon={<Sun className="h-5 w-5" />} />
            <QuickTool onClick={onOpenEveningAzkar || onOpenAzkar} title="أذكار المساء" tone="purple" icon={<Moon className="h-5 w-5" />} />
          </div>
        </section>
      </main>
    </div>
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
