import './compassDiagnostics.css'
import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { decimalYear } from './declination'
import { normalize360 } from './heading'

/** Raw facts about the orientation events the WebView delivers. Read-only: nothing here changes the heading. */
export type CompassDiagSnapshot = {
  absoluteEvents: number
  relativeEvents: number
  lastType: 'deviceorientationabsolute' | 'deviceorientation' | null
  alpha: number | null
  beta: number | null
  gamma: number | null
  eventAbsoluteFlag: boolean | null
  webkitHeading: number | null
  webkitAccuracy: number | null
  eulerHeading: number | null
}

export const emptyDiag = (): CompassDiagSnapshot => ({
  absoluteEvents: 0,
  relativeEvents: 0,
  lastType: null,
  alpha: null,
  beta: null,
  gamma: null,
  eventAbsoluteFlag: null,
  webkitHeading: null,
  webkitAccuracy: null,
  eulerHeading: null,
})

const fmt = (n: number | null, digits = 1) => (n === null || !Number.isFinite(n) ? 'غير متاح' : n.toFixed(digits))
const yn = (v: boolean) => (v ? 'نعم' : 'لا')

function webViewVersion(): string {
  if (typeof navigator === 'undefined') return 'غير متاح'
  return /(?:Chrome|CriOS)\/([\d.]+)/.exec(navigator.userAgent)?.[1] ?? 'غير متاح'
}

export function CompassDiagnostics({
  getSnapshot,
  coords,
  declination,
}: {
  getSnapshot: () => CompassDiagSnapshot
  coords: { lat: number; lng: number }
  declination: number | null
}) {
  const [open, setOpen] = useState(false)
  const [snap, setSnap] = useState<CompassDiagSnapshot>(() => getSnapshot())

  useEffect(() => {
    if (!open) return
    setSnap({ ...getSnapshot() })
    const id = window.setInterval(() => setSnap({ ...getSnapshot() }), 500)
    return () => window.clearInterval(id)
  }, [open, getSnapshot])

  const win = (typeof window === 'undefined' ? {} : window) as unknown as Record<string, unknown>
  const heading = snap.eulerHeading
  const rows: Array<[string, string]> = [
    ['المنصة', Capacitor.isNativePlatform() ? 'تطبيق مثبّت' : 'متصفح'],
    ['إصدار WebView', webViewVersion()],
    ['آخر حدث', snap.lastType ?? 'لا يوجد'],
    ['عدد أحداث deviceorientationabsolute', String(snap.absoluteEvents)],
    ['عدد أحداث deviceorientation', String(snap.relativeEvents)],
    ['alpha الخام', fmt(snap.alpha)],
    ['beta الخام', fmt(snap.beta)],
    ['gamma الخام', fmt(snap.gamma)],
    ['absolute في الحدث', snap.eventAbsoluteFlag === null ? 'غير متاح' : yn(snap.eventAbsoluteFlag)],
    ['webkitCompassHeading', fmt(snap.webkitHeading)],
    ['دقة المستشعر (webkitCompassAccuracy)', fmt(snap.webkitAccuracy)],
    ['Magnetometer API', yn('Magnetometer' in win)],
    ['AbsoluteOrientationSensor API', yn('AbsoluteOrientationSensor' in win)],
    ['الموقع المستخدم', `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`],
    ['السنة العشرية', decimalYear(new Date()).toFixed(2)],
    ['الانحراف المغناطيسي المحسوب', declination === null ? 'غير متاح' : `${declination.toFixed(2)}°`],
    ['الاتجاه المحسوب من الحدث (بدون انحراف)', fmt(heading)],
    ['الاتجاه + الانحراف', heading === null || declination === null ? 'غير متاح' : fmt(normalize360(heading + declination))],
  ]

  return (
    <div className="q2-diag">
      <button type="button" className="q2-diag-toggle u-pressable" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? 'إخفاء التشخيص' : 'تشخيص البوصلة'}
      </button>
      {open ? (
        <dl className="q2-diag-list" dir="rtl">
          {rows.map(([k, v]) => (
            <div key={k} className="q2-diag-row">
              <dt>{k}</dt>
              <dd dir="ltr">{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}
