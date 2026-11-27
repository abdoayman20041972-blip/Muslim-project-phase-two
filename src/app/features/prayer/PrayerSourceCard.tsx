import { useEffect, useState } from 'react'
import { acquireLocation, locationFailureMessage } from '../location/acquireLocation'
import { normalizeCoords, readStoredCoords, saveCoords } from '../location/coords'
import { APP_SETTINGS_KEYS, readSetting, writeSetting } from '../../settings'

// Cairo point that reproduces the printed Egyptian wall-calendar times for 26 Nov 2026
// (Egyptian General Authority of Survey angles, nearest minute). Only one calendar day was checked.
export const CAIRO_CALENDAR_POINT = { lat: 30.05, lng: 31.22 } as const

export const PRAYER_CITIES: ReadonlyArray<readonly [string, number, number]> = [
  ['القاهرة', CAIRO_CALENDAR_POINT.lat, CAIRO_CALENDAR_POINT.lng],
  ['الجيزة', 30.0131, 31.2089],
  ['الإسكندرية', 31.2001, 29.9187],
  ['بنها', 30.4659, 31.1848],
  ['المنصورة', 31.0409, 31.3785],
  ['شبين القناطر', 30.3127, 31.3202],
  ['طنطا', 30.7865, 30.9982],
  ['الزقازيق', 30.5877, 31.502],
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
]

type Source = 'cairo' | 'gps' | 'city'
const read = (): Source => {
  const v = readSetting(APP_SETTINGS_KEYS.prayerSource, '')
  if (v === 'cairo' || v === 'gps' || v === 'city') return v
  const c = readStoredCoords()
  return c && c.lat === CAIRO_CALENDAR_POINT.lat && c.lng === CAIRO_CALENDAR_POINT.lng ? 'cairo' : 'gps'
}

/** Visible control for where prayer times are calculated from. */
export function PrayerSourceCard() {
  const [source, setSource] = useState<Source>(read)
  const [openCities, setOpenCities] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    const f = () => setSource(read())
    window.addEventListener('azkar-prayer-settings-changed', f)
    return () => window.removeEventListener('azkar-prayer-settings-changed', f)
  }, [])
  const apply = (next: Source, lat: number, lng: number) => {
    const c = normalizeCoords({ lat, lng })
    if (!c) return
    writeSetting(APP_SETTINGS_KEYS.prayerSource, next)
    saveCoords(c)
    setSource(next)
    setMessage(null)
  }
  const useGps = async () => {
    setBusy(true)
    setMessage(null)
    const result = await acquireLocation()
    if (result.ok) apply('gps', result.coords.lat, result.coords.lng)
    else setMessage(locationFailureMessage(result.reason))
    setBusy(false)
  }
  const stored = readStoredCoords()
  const btn = (on: boolean) =>
    `u-pressable min-h-11 rounded-[1rem] px-2 py-2 text-[0.75rem] font-bold ${on ? 'bg-azkar-teal text-azkar-card' : 'border border-azkar-gold-soft text-azkar-teal-ink'}`
  return (
    <div className="rounded-[var(--r-lg)] border border-azkar-gold-soft bg-azkar-card p-4 mb-4 shadow-sm" data-testid="prayer-source-card">
      <div className="text-[0.8125rem] font-bold text-azkar-ink">مكان المواقيت</div>
      <div className="mt-1 text-[0.6875rem] leading-5 text-azkar-ink-faint">
        اختر المكان الذي تُحسب له المواقيت: القاهرة (مطابق للنتيجة المطبوعة)، أو موقعك الحالي، أو مدينة تختارها.
      </div>
      <div dir="rtl" className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" aria-pressed={source === 'cairo'} className={btn(source === 'cairo')} onClick={() => { setOpenCities(false); apply('cairo', CAIRO_CALENDAR_POINT.lat, CAIRO_CALENDAR_POINT.lng) }}>
          القاهرة
        </button>
        <button type="button" aria-pressed={source === 'gps'} disabled={busy} className={btn(source === 'gps')} onClick={() => { setOpenCities(false); void useGps() }}>
          {busy ? 'جاري التحديد...' : 'موقعي الحالي'}
        </button>
        <button type="button" aria-pressed={source === 'city'} className={btn(source === 'city')} onClick={() => setOpenCities((v) => !v)}>
          مدينة أخرى
        </button>
      </div>
      {openCities && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {PRAYER_CITIES.map(([name, lat, lng]) => (
            <button
              key={name}
              type="button"
              onClick={() => { apply(name === 'القاهرة' ? 'cairo' : 'city', lat, lng); setOpenCities(false) }}
              className="u-pressable min-h-10 rounded-full border border-azkar-gold-soft px-3 py-2 text-[0.75rem]"
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {message && <p role="alert" className="mt-2 text-[0.8125rem] text-azkar-ink-soft">{message}</p>}
      {stored && (
        <div className="mt-2 text-[0.6875rem] text-azkar-ink-faint" dir="ltr">
          {stored.lat.toFixed(2)}, {stored.lng.toFixed(2)}
        </div>
      )}
    </div>
  )
}
