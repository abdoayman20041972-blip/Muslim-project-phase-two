import { RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createHeadingFilter,
  currentScreenAngle,
  headingFromEuler,
  needleRotation,
  normalize360,
  shortestDelta,
} from './heading'

const KAABA = { lat: 21.4225, lng: 39.8262 }
const rad = (v: number) => (v * Math.PI) / 180

/** Initial great-circle bearing (true north, degrees clockwise) from a point to the Kaaba. */
export function qiblaBearing(lat: number, lng: number) {
  const dl = rad(KAABA.lng - lng)
  const y = Math.sin(dl) * Math.cos(rad(KAABA.lat))
  const x =
    Math.cos(rad(lat)) * Math.sin(rad(KAABA.lat)) -
    Math.sin(rad(lat)) * Math.cos(rad(KAABA.lat)) * Math.cos(dl)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function angularDiff(a: number, b: number) {
  return ((a - b + 540) % 360) - 180
}

export function dialLabelAngle(cardinalDeg: number, heading: number | null) {
  return heading === null ? cardinalDeg : cardinalDeg - heading
}

type OrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number
  webkitCompassAccuracy?: number
}

type Status = 'idle' | 'needs-permission' | 'waiting' | 'active' | 'denied' | 'unavailable' | 'no-absolute' | 'insecure'

const STATUS_TEXT: Partial<Record<Status, string>> = {
  'needs-permission': 'اضغط «تفعيل» للسماح باستخدام بوصلة الهاتف',
  waiting: 'جارٍ قراءة مستشعر الاتجاه…',
  denied: 'تم رفض إذن الحركة والاتجاه. فعّله من إعدادات المتصفح ثم أعد المحاولة',
  unavailable: 'لا تصل قراءات من المستشعر. تأكد أن «Motion sensors» مفعّل لهذا الموقع في إعدادات Chrome ثم أعد المحاولة',
  insecure: 'مستشعر الاتجاه يتطلب اتصالًا آمنًا (HTTPS)',
  'no-absolute': 'المتصفح لا يوفّر اتجاه الشمال المغناطيسي، لذا لا يمكن تحديد القبلة بدقة',
}

const TICKS = Array.from({ length: 72 }, (_, i) => i * 5)
const RIVETS = [0, 45, 90, 135, 180, 225, 270, 315]

export function QiblaCompass({ coords }: { coords: { lat: number; lng: number } }) {
  const [heading, setHeading] = useState<number | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [lowAccuracy, setLowAccuracy] = useState(false)
  const stopRef = useRef<(() => void) | null>(null)
  const filterRef = useRef(createHeadingFilter(140))

  const bearing = qiblaBearing(coords.lat, coords.lng)

  const stop = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
  }, [])

  const start = useCallback(() => {
    stop()
    const filter = filterRef.current
    filter.reset()
    setHeading(null)
    setStatus('waiting')

    let raf = 0
    let pending: number | null = null
    let sawAnyEvent = false
    let absoluteEventSeen = false

    const flush = () => {
      raf = 0
      if (pending === null) return
      setHeading(pending)
      pending = null
    }

    const publish = (deg: number) => {
      pending = filter.push(deg, performance.now())
      setStatus('active')
      if (!raf) raf = requestAnimationFrame(flush)
    }

    const handle = (event: Event, fromAbsoluteEvent: boolean) => {
      const e = event as OrientationEvent
      sawAnyEvent = true

      // 1) iOS: webkitCompassHeading is a ready-made magnetic heading of the device top.
      if (typeof e.webkitCompassHeading === 'number' && Number.isFinite(e.webkitCompassHeading) && e.webkitCompassHeading >= 0) {
        if (typeof e.webkitCompassAccuracy === 'number') setLowAccuracy(e.webkitCompassAccuracy < 0 || e.webkitCompassAccuracy > 25)
        publish(normalize360(e.webkitCompassHeading + currentScreenAngle()))
        return
      }

      // 2) Android/Chrome: only north-referenced (absolute) Euler angles are a compass.
      if (!fromAbsoluteEvent && absoluteEventSeen) return
      if (!(fromAbsoluteEvent || e.absolute === true)) return
      if (typeof e.alpha !== 'number' || typeof e.beta !== 'number' || typeof e.gamma !== 'number') return
      if (fromAbsoluteEvent) absoluteEventSeen = true
      const h = headingFromEuler(e.alpha, e.beta, e.gamma, currentScreenAngle())
      if (h !== null && Number.isFinite(h)) publish(h)
    }

    const onAbsolute = (event: Event) => handle(event, true)
    const onOrientation = (event: Event) => handle(event, false)

    window.addEventListener('deviceorientationabsolute', onAbsolute, true)
    window.addEventListener('deviceorientation', onOrientation, true)

    const timer = window.setTimeout(() => {
      setStatus((current) => (current === 'waiting' ? (sawAnyEvent ? 'no-absolute' : 'unavailable') : current))
    }, 2500)

    stopRef.current = () => {
      window.removeEventListener('deviceorientationabsolute', onAbsolute, true)
      window.removeEventListener('deviceorientation', onOrientation, true)
      window.clearTimeout(timer)
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      pending = null
    }
  }, [stop])

  const enable = useCallback(async () => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setStatus('insecure')
      return
    }
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setStatus('unavailable')
      return
    }
    const DOE = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (typeof DOE.requestPermission === 'function') {
      try {
        const result = await DOE.requestPermission()
        if (result !== 'granted') {
          setStatus('denied')
          return
        }
      } catch {
        setStatus('denied')
        return
      }
    }
    start()
  }, [start])

  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setStatus('unavailable')
      return
    }
    const DOE = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: unknown }
    if (typeof DOE.requestPermission === 'function') {
      // iOS: permission must come from a user gesture, so wait for the button.
      setStatus('needs-permission')
    } else {
      start()
    }
    return () => {
      stop()
    }
  }, [start, stop])

  const onCalibrate = () => {
    // The OS owns magnetometer calibration; this just restarts the reading.
    void enable()
  }

  const active = status === 'active' && heading !== null
  const rotation = active ? needleRotation(bearing, heading) : 0
  const aligned = active && Math.abs(shortestDelta(bearing, normalize360(heading))) <= 4

  let message = STATUS_TEXT[status] ?? ''
  if (status === 'active' && lowAccuracy) message = 'دقة البوصلة منخفضة، ابتعد عن المعادن والمغناطيس'

  return (
    <div className="q2-compass-shell">
      <div className={'q2-dial' + (aligned ? ' is-aligned' : '')} role="img" aria-label="بوصلة القبلة">
        <svg className="q2-dial-face" viewBox="0 0 240 240" aria-hidden="true">
          <defs>
            <linearGradient id="qd-brass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f3dc9a" />
              <stop offset=".45" stopColor="#b98a3a" />
              <stop offset="1" stopColor="#6e4d17" />
            </linearGradient>
            <linearGradient id="qd-brass-rev" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#f0d48c" />
              <stop offset=".5" stopColor="#a47a2e" />
              <stop offset="1" stopColor="#5b3f12" />
            </linearGradient>
            <radialGradient id="qd-face" cx=".5" cy=".42" r=".65">
              <stop offset="0" stopColor="#4e2f1b" />
              <stop offset=".7" stopColor="#31200f" />
              <stop offset="1" stopColor="#1b0e06" />
            </radialGradient>
            <linearGradient id="qd-glass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".2" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="120" cy="120" r="119" fill="#2a1d08" />
          <circle cx="120" cy="120" r="116" fill="url(#qd-brass)" />
          <circle cx="120" cy="120" r="107" fill="url(#qd-brass-rev)" />
          {RIVETS.map((deg) => (
            <circle key={deg} cx="120" cy="8.8" r="1.7" fill="#2a1d08" stroke="#f3dc9a" strokeWidth=".6" transform={`rotate(${deg} 120 120)`} />
          ))}
          <circle cx="120" cy="120" r="102" fill="url(#qd-face)" stroke="#efd9a7" strokeWidth="1" />
          {TICKS.map((deg) => {
            const major = deg % 30 === 0
            const mid = deg % 10 === 0
            return (
              <line
                key={deg}
                x1="120"
                y1="20"
                x2="120"
                y2={major ? 32 : mid ? 27 : 24}
                stroke="#efd9a7"
                strokeWidth={major ? 2 : 1}
                strokeLinecap="round"
                opacity={major ? 1 : 0.75}
                transform={`rotate(${deg} 120 120)`}
              />
            )
          })}
          <circle cx="120" cy="120" r="76" fill="none" stroke="#efd9a7" strokeWidth=".8" strokeDasharray="1 4.2" opacity=".7" />
          <g fill="none" stroke="#efd9a7" strokeWidth=".9" opacity=".45">
            <rect x="82" y="82" width="76" height="76" />
            <rect x="82" y="82" width="76" height="76" transform="rotate(45 120 120)" />
            <circle cx="120" cy="120" r="54" />
          </g>
          <polygon points="120,10 112.5,22 127.5,22" fill="#f6e7b8" stroke="#5b3f12" strokeWidth="1" strokeLinejoin="round" />
          <ellipse cx="120" cy="66" rx="78" ry="44" fill="url(#qd-glass)" />
        </svg>

        <div className={'q2-needle-layer' + (active ? ' is-on' : '')} style={{ transform: `rotate(${rotation}deg)` }} aria-hidden="true">
          <svg viewBox="0 0 240 240" className={'q2-needle' + (aligned ? ' is-aligned' : '')}>
            <defs>
              <linearGradient id="qn-gold" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#8a6320" />
                <stop offset=".5" stopColor="#f6e1a0" />
                <stop offset="1" stopColor="#9a7126" />
              </linearGradient>
            </defs>
            <path d="M120 126 L111 150 L120 166 L129 150 Z" fill="#241408" stroke="#efd9a7" strokeWidth=".8" />
            <path
              className="q2-needle-arrow"
              d="M120 12 L146 62 L129 62 L129 126 L111 126 L111 62 L94 62 Z"
              fill="url(#qn-gold)"
              stroke="#4d3510"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <span className="q2-hub" aria-hidden="true" />
      </div>

      <p className="q2-status" aria-live="polite">{message}</p>

      <button type="button" onClick={onCalibrate} aria-label={status === 'needs-permission' ? 'تفعيل البوصلة' : status === 'active' || status === 'waiting' ? 'معايرة البوصلة' : 'إعادة المحاولة'} className="q2-calibrate u-pressable">
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        <span>{status === 'needs-permission' ? 'تفعيل' : status === 'denied' || status === 'unavailable' || status === 'no-absolute' || status === 'insecure' ? 'إعادة المحاولة' : 'معايرة'}</span>
      </button>
    </div>
  )
}
