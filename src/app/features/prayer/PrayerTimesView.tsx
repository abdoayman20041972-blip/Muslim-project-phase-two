import { useEffect, useState } from 'react'
import { acquireLocation, locationFailureMessage } from '../location/acquireLocation'
import { saveCoords } from '../location/coords'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'
import { formatLocalizedDate } from '../../constants'
import {
  currentMethod,
  currentSchool,
  formatCountdown,
  formatPrayerTime,
  normalizeCoords,
  readPrayerCoords,
  useNextPrayer,
  usePrayerTimings,
  type Coords,
  type Timings,
} from './prayerTimes'
const PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const
const REMINDER_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const
const LABELS: Record<string, string> = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
}
const METHOD_LABELS: Record<string, string> = {
  '1': 'جامعة العلوم الإسلامية بكراتشي',
  '2': 'الجمعية الإسلامية بأمريكا الشمالية',
  '3': 'رابطة العالم الإسلامي',
  '4': 'جامعة أم القرى',
  '5': 'الهيئة المصرية العامة للمساحة',
}
const CITIES = [
  // M7 fix: expanded preset list — every Egyptian governorate capital, all offline.
  ['القاهرة', 30.0444, 31.2357],
  ['الجيزة', 30.0131, 31.2089],
  ['الإسكندرية', 31.2001, 29.9187],
  ['المنصورة', 31.0409, 31.3785],
  ['شبين القناطر', 30.3127, 31.3202],
  ['طنطا', 30.7865, 30.9982],
  ['الزقازيق', 30.5877, 31.5020],
  ['دمنهور', 31.0341, 30.4682],
  ['كفر الشيخ', 31.1114, 30.9478],
  ['بورسعيد', 31.2653, 32.3019],
  ['الإسماعيلية', 30.5965, 32.2715],
  ['السويس', 29.9668, 32.5498],
  ['دمياط', 31.4165, 31.8133],
  ['العريش', 31.1296, 33.8004],
  ['بني سويف', 29.0661, 31.0994],
  ['الفيوم', 29.3084, 30.8428],
  ['المنيا', 28.1099, 30.7503],
  ['أسيوط', 27.181, 31.1837],
  ['سوهاج', 26.5591, 31.6957],
  ['قنا', 26.1551, 32.716],
  ['الأقصر', 25.6872, 32.6396],
  ['أسوان', 24.0889, 32.8998],
  ['الغردقة', 27.2579, 33.7959],
  ['مرسى مطروح', 31.3534, 27.2243],
  ['الخارجة', 25.4514, 30.5464],
] as const
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M20 10.5c0 5.3-8 10-8 10s-8-4.7-8-10a8 8 0 1 1 16 0Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:rotate-180" fill="none" aria-hidden="true">
      <path
        d="M15 5l-7 7 7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function PrayerTimeline({
  timings,
  now,
  nextKey,
}: {
  timings: Timings
  now: Date
  nextKey: string | null
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="font-amiri font-bold text-base text-azkar-teal-ink">مواقيت اليوم</span>
        <span className="text-[10px] text-azkar-ink-soft">
          {formatLocalizedDate(now, { weekday: 'long', day: 'numeric', month: 'long' }, 'ar-EG')}
        </span>
      </div>
      <div className="prayer-timeline-grid grid grid-cols-5 gap-1.5">
        {REMINDER_PRAYERS.map((key) => {
          const next = key === nextKey
          return (
            <div
              key={key}
              className={`prayer-time-chip rounded-[1rem] px-1.5 py-2.5 text-center border ${next ? 'bg-azkar-teal text-azkar-card border-azkar-teal' : 'bg-azkar-bg-alt border-azkar-gold-soft/70 text-azkar-ink'}`}
            >
              <div className="text-[9px] font-bold mb-1">{LABELS[key]}</div>
              <div className="text-[11px] font-semibold">
                {timings[key] ? formatPrayerTime(timings[key]) : '—:—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
function NextPrayerCard({
  coords,
  timings: parentTimings,
  onNextKeyChange,
}: {
  coords: Coords
  timings: Timings | null
  onNextKeyChange: (key: string | null) => void
}) {
  const { next, remainingMs } = useNextPrayer(coords, parentTimings)
  useEffect(() => {
    onNextKeyChange(next?.key ?? null)
  }, [next?.key, onNextKeyChange])
  return (
    <div className="relative overflow-hidden bg-azkar-teal-deep text-azkar-card rounded-[var(--r-lg)] border border-azkar-teal/40 p-5 mb-4 shadow-[0_8px_24px_rgba(31,61,52,.13)]">
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] opacity-65 mb-1">الصلاة القادمة</div>
          <div aria-live="polite" className="font-amiri text-2xl font-bold truncate">
            {next?.key === 'Fajr'
              ? 'الفجر'
              : next?.key === 'Dhuhr'
                ? 'الظهر'
                : next?.key === 'Asr'
                  ? 'العصر'
                  : next?.key === 'Maghrib'
                    ? 'المغرب'
                    : next?.key === 'Isha'
                      ? 'العشاء'
                      : 'لا توجد مواقيت متاحة'}
          </div>
          <div className="mt-0.5 text-[9px] opacity-55">{next?.tomorrow ? 'غدًا' : ''}</div>
          <div className="mt-1 text-[11px] opacity-70">متبقي {formatCountdown(remainingMs)}</div>
        </div>
        <div className="shrink-0 text-left" dir="rtl">
          <div className="font-amiri text-[10px] opacity-60">الوقت</div>
          <div className="mt-0.5 text-xl font-bold tabular-nums">
            {next ? formatPrayerTime(next.time.toTimeString().slice(0, 5)) : '—:—'}
          </div>
        </div>
      </div>
    </div>
  )
}
export function PrayerTimesView({ onBack, onOpenQibla }: { onBack: () => void; onOpenQibla?: () => void }) {
  const [coords, setCoords] = useState<Coords | null>(() => readPrayerCoords()),
    [locating, setLocating] = useState(false),
    [locationError, setLocationError] = useState<string | null>(null),
    [nextKey, setNextKey] = useState<string | null>(null)
  const { timings, loading, error, retry } = usePrayerTimings(coords)
  useEffect(() => {
    const refresh = () => {
      const c = readPrayerCoords()
      setCoords(c)
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('azkar-prayer-settings-changed', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('azkar-prayer-settings-changed', refresh)
    }
  }, [])
  const locate = async () => {
    setLocating(true)
    setLocationError(null)
    const result = await acquireLocation()
    if (result.ok) {
      saveCoords(result.coords)
      setCoords(result.coords)
    } else {
      setLocationError(locationFailureMessage(result.reason))
    }
    setLocating(false)
  }
  const chooseCity = (lat: number, lng: number) => {
    const c = normalizeCoords({ lat, lng })
    if (c) {
      saveCoords(c)
      setCoords(c)
      setLocationError(null)
    }
  }
  const [manualLat, setManualLat] = useState(''),
    [manualLng, setManualLng] = useState('')
  const saveManual = () => {
    const lat = Number(manualLat),
      lng = Number(manualLng),
      c = normalizeCoords({ lat, lng })
    if (!c) {
      setLocationError('أدخل إحداثيات صحيحة: خط العرض بين -90 و90 وخط الطول بين -180 و180.')
      return
    }
    chooseCity(c.lat, c.lng)
  }
  const [methodLabel, setMethodLabel] = useState(currentMethod())
  useEffect(() => {
    const f = () => setMethodLabel(currentMethod())
    window.addEventListener('azkar-prayer-settings-changed', f)
    return () => window.removeEventListener('azkar-prayer-settings-changed', f)
  }, [])
  return (
    <div className="prayer-screen animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-azkar-card border border-azkar-gold-soft flex items-center justify-center text-azkar-teal shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal"
          aria-label="رجوع"
        >
          <BackIcon />
        </button>
        <div className="flex-1">
          <div className="font-amiri font-bold text-2xl text-azkar-teal-ink">مواقيت الصلاة</div>
          <div className="text-[10px] text-azkar-ink-faint mt-0.5">صلاتك في وقتها</div>
        </div>
        {onOpenQibla ? (
          <button
            type="button"
            onClick={onOpenQibla}
            className="u-pressable w-9 h-9 rounded-full bg-azkar-teal-tint text-azkar-teal-ink flex items-center justify-center text-base"
            aria-label="القبلة"
            title="القبلة"
          >
            🧭
          </button>
        ) : (
          <span className="w-9 h-9 rounded-full bg-azkar-teal-tint text-azkar-teal-ink flex items-center justify-center">
            <PinIcon />
          </span>
        )}
      </div>
      {!coords && (
        <div className="relative overflow-hidden rounded-[var(--r-lg)] border border-azkar-gold-soft bg-azkar-card p-6 text-center shadow-sm">
          <div className="relative mx-auto mb-4 w-14 h-14 rounded-2xl border border-azkar-gold-soft bg-azkar-bg-alt text-azkar-teal flex items-center justify-center">
            <PinIcon />
          </div>
          <p className="font-amiri font-bold text-lg mb-2">نحتاج موقعك لحساب المواقيت</p>
          <p className="text-xs text-azkar-ink-soft leading-6 mb-4">
            يمكنك السماح بالموقع، أو اختيار مدينة، أو إدخال الإحداثيات يدويًا. تُحفظ الإحداثيات بدقة
            تقريبية لتقليل بيانات الموقع المخزنة.
          </p>
          <button
            onClick={locate}
            disabled={locating}
            className="u-pressable rounded-[1.1rem] bg-azkar-teal text-azkar-card px-6 py-3 text-sm font-bold disabled:opacity-60"
          >
            {locating ? 'جاري تحديد الموقع...' : 'تحديد موقعي'}
          </button>
          {locationError && <p role="alert" className="mt-3 text-xs text-azkar-ink-soft">{locationError}</p>}
          <div className="mt-5">
            <div className="text-[10px] font-bold text-azkar-ink-soft mb-2">اختر مدينة</div>
            <div className="flex flex-wrap justify-center gap-2">
              {CITIES.map(([name, lat, lng]) => (
                <button
                  key={name}
                  onClick={() => chooseCity(lat, lng)}
                  className="rounded-full border border-azkar-gold-soft px-3 py-2 text-[10px]"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <input
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              inputMode="decimal"
              placeholder="خط العرض"
              className="rounded-xl border border-azkar-hairline bg-azkar-bg-alt px-3 py-2 text-xs"
            />
            <input
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              inputMode="decimal"
              placeholder="خط الطول"
              className="rounded-xl border border-azkar-hairline bg-azkar-bg-alt px-3 py-2 text-xs"
            />
          </div>
          <button
            onClick={saveManual}
            className="mt-2 rounded-xl border border-azkar-gold-soft px-4 py-2 text-xs font-bold"
          >
            استخدام الإحداثيات
          </button>
        </div>
      )}
      {coords && loading && !timings && (
        <div role="status" className="rounded-[var(--r-lg)] border border-azkar-gold-soft bg-azkar-card text-center text-sm text-azkar-ink-soft py-12">
          جاري حساب مواقيت الصلاة...
        </div>
      )}
      {coords && error && !timings && (
        <div role="alert" className="rounded-[var(--r-lg)] border border-azkar-gold-soft bg-azkar-card text-center text-sm text-azkar-ink-soft py-10 px-4">
          <p>{error}</p>
          <button onClick={retry} className="mt-3 rounded-xl bg-azkar-teal px-4 py-2 text-xs font-bold text-azkar-card">
            إعادة المحاولة
          </button>
          <button onClick={locate} className="mt-3 text-xs text-azkar-teal underline">
            تحديث الموقع وإعادة المحاولة
          </button>
        </div>
      )}
      {coords && timings && (
        <>
          <NextPrayerCard coords={coords} timings={timings} onNextKeyChange={setNextKey} />
          <div className="rounded-[var(--r-lg)] border border-azkar-gold-soft bg-azkar-card p-4 mb-4 shadow-sm">
            <PrayerTimeline timings={timings} now={new Date()} nextKey={nextKey} />
          </div>
          <div className="rounded-[var(--r-lg)] border border-azkar-gold-soft bg-azkar-card p-4 mb-4 shadow-sm">
            <div className="text-[10px] text-azkar-ink-faint">التاريخ الهجري</div>
            <div className="mt-1 font-amiri text-lg font-bold text-azkar-teal-ink">
              {formatLocalizedDate(
                new Date(),
                { day: 'numeric', month: 'long', year: 'numeric' },
                'ar-SA-u-ca-islamic-umalqura',
              )}
            </div>
            <div className="mt-1 text-[9px] text-azkar-ink-faint">
              تاريخ تقويمي محسوب وفق تقويم أم القرى، وقد يختلف عن الرؤية المحلية للهلال.
            </div>
          </div>
          <div className="rounded-[var(--r-lg)] border border-azkar-gold-soft bg-azkar-card overflow-hidden mb-4 shadow-sm">
            <div className="px-5 py-3.5 border-b border-azkar-gold-soft/50 flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-azkar-ink">تفاصيل اليوم</span>
              <span className="text-[9px] text-azkar-ink-faint">
                {formatLocalizedDate(
                  new Date(),
                  { year: 'numeric', month: '2-digit', day: '2-digit' },
                  'en-US',
                )}
              </span>
            </div>
            {PRAYER_ORDER.map((key) => (
              <div
                key={key}
                className="flex items-center justify-between px-5 py-4 min-h-14 border-b last:border-b-0 border-azkar-gold-soft/40"
              >
                <span className="font-amiri text-[17px]">{LABELS[key]}</span>
                <span className="text-sm text-azkar-ink-soft">
                  {timings[key] ? formatPrayerTime(timings[key]) : '—:—'}
                </span>
              </div>
            ))}
          </div>
          <div className="text-center text-[9px] text-azkar-ink-faint">
            طريقة الحساب: {METHOD_LABELS[methodLabel] || methodLabel} · المدرسة الفقهية للعصر:{' '}
            {currentSchool() === '1' ? 'حنفي' : 'شافعي/قياسي'} · آخر تحديث للموقع:{' '}
            {readSetting(APP_SETTINGS_KEYS.prayerLocationUpdatedAt, '')
              ? formatLocalizedDate(
                  new Date(readSetting(APP_SETTINGS_KEYS.prayerLocationUpdatedAt, '')),
                  { dateStyle: 'medium', timeStyle: 'short' },
                  'ar-EG',
                )
              : 'غير مسجل'}{' '}
            · الإحداثيات محفوظة بدقة تقريبية (≈ ١ كم).
          </div>
        </>
      )}
    </div>
  )
}
