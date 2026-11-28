import { Capacitor } from '@capacitor/core'
import { RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'
import { CompassDiagnostics, emptyDiag, type CompassDiagSnapshot } from './CompassDiagnostics'
import { magneticDeclination } from './declination'
import { directionName, distanceToKaabaKm } from './qiblaInfo'
import { useKeepAwakeWhileOpen } from './useKeepAwakeWhileOpen'
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

export function dialLabelAngle(cardinalDeg: number, heading: number | null) {
  return heading === null ? cardinalDeg : cardinalDeg - heading
}

type OrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number
  webkitCompassAccuracy?: number
}

type Status = 'idle' | 'needs-permission' | 'waiting' | 'active' | 'denied' | 'unavailable' | 'no-absolute' | 'insecure'

// Browser wording: inside a real browser the user CAN reach these settings.
const STATUS_TEXT_WEB: Partial<Record<Status, string>> = {
  'needs-permission': 'اضغط «تفعيل» للسماح باستخدام بوصلة الهاتف',
  waiting: 'جارٍ قراءة مستشعر الاتجاه…',
  denied: 'تم رفض إذن الحركة والاتجاه. فعّله من إعدادات المتصفح ثم أعد المحاولة',
  unavailable: 'لا تصل قراءات من المستشعر. تأكد أن «Motion sensors» مفعّل لهذا الموقع في إعدادات Chrome ثم أعد المحاولة',
  insecure: 'مستشعر الاتجاه يتطلب اتصالًا آمنًا (HTTPS)',
  'no-absolute': 'المتصفح لا يوفّر اتجاه الشمال المغناطيسي، لذا لا يمكن تحديد القبلة بدقة',
}

// Installed-app wording: there are no Chrome settings inside the APK, so the
// guidance must be things the user can actually do on the device itself.
const STATUS_TEXT_NATIVE: Partial<Record<Status, string>> = {
  'needs-permission': 'اضغط «تفعيل» للسماح باستخدام بوصلة الهاتف',
  waiting: 'جارٍ قراءة مستشعر الاتجاه…',
  denied: 'تم رفض إذن الحركة والاتجاه. فعّله من إعدادات الجهاز ثم أعد المحاولة',
  unavailable: 'لا تصل قراءات من مستشعر الاتجاه. ابتعد عن المعادن والمغناطيس ثم أعد المحاولة؛ وإن استمرت المشكلة فربما لا يحتوي الجهاز على مستشعر للاتجاه',
  insecure: 'مستشعر الاتجاه يتطلب اتصالًا آمنًا (HTTPS)',
  'no-absolute': 'الجهاز لا يوفّر اتجاه الشمال المغناطيسي، لذا لا يمكن تحديد القبلة بدقة',
}

const TICKS = Array.from({ length: 72 }, (_, i) => i * 5)
const RIVETS = [0, 45, 90, 135, 180, 225, 270, 315]
// Arabic cardinal abbreviations: ش شمال 0°, ق شرق 90° (ش taken by شمال), ج جنوب 180°, غ غرب 270°.
// Full Arabic direction names: single-letter abbreviations are ambiguous
// (north and east both start with ش), so the ring spells each direction out.
const CARDINALS: { deg: number; label: string }[] = [
  { deg: 0, label: 'شمال' },
  { deg: 90, label: 'شرق' },
  { deg: 180, label: 'جنوب' },
  { deg: 270, label: 'غرب' },
]

// Jitter detection on the Android Euler path: the residual left after removing
// the consistent-rotation part of the raw heading stream. A smooth deliberate
// turn cancels out; sensor noise (rapid sign flips) does not.
const JITTER_WINDOW_MS = 2500
const JITTER_MIN_SAMPLES = 12
const JITTER_ON_DEG = 6
const JITTER_OFF_DEG = 3

export function QiblaCompass({ coords }: { coords: { lat: number; lng: number } }) {
  useKeepAwakeWhileOpen()
  const [heading, setHeading] = useState<number | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [lowAccuracy, setLowAccuracy] = useState(false)
  const [invalidPose, setInvalidPose] = useState(false)
  const [declinationUnknown, setDeclinationUnknown] = useState(false)
  const [fluctuating, setFluctuating] = useState(false)
  const [calibrationHint, setCalibrationHint] = useState(false)
  const [alignedAnnounce, setAlignedAnnounce] = useState('')
  const stopRef = useRef<(() => void) | null>(null)
  const filterRef = useRef(createHeadingFilter(140))
  const jitterRef = useRef<{ t: number; h: number }[]>([])
  const calibrationTimerRef = useRef(0)
  const alignedRef = useRef(false)
  // Read-only diagnostics for the on-device test panel; never feeds back into the heading.
  const diagRef = useRef<CompassDiagSnapshot>(emptyDiag())
  const getDiag = useCallback(() => diagRef.current, [])

  const bearing = qiblaBearing(coords.lat, coords.lng)
  // Magnetic declination at the user's location (true = magnetic + declination).
  // Applied ONLY on the iOS webkitCompassHeading path, which Apple documents as
  // magnetic-north referenced. The Android deviceorientationabsolute path is left
  // uncorrected on purpose: its north reference (magnetic vs true) is strongly
  // indicated but not yet measured on the target WebView, so applying a blind
  // correction could add the very error it means to remove. Verify on device first.
  // Null when no reliable declination exists (out-of-range coordinates, a date
  // outside the WMM2025 2025-2029 validity window, or a polar blackout zone);
  // the iOS path then refuses to show a magnetic heading it cannot correct.
  const declination = useMemo(() => magneticDeclination(coords.lat, coords.lng), [coords.lat, coords.lng])

  const stop = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
  }, [])

  const start = useCallback(() => {
    stop()
    const filter = filterRef.current
    filter.reset()
    jitterRef.current = []
    setHeading(null)
    setInvalidPose(false)
    setDeclinationUnknown(false)
    setFluctuating(false)
    setStatus('waiting')

    let raf = 0
    let pending: number | null = null
    let sawAnyEvent = false
    let absoluteEventSeen = false
    let nullStreak = 0

    let lastShown: number | null = null
    const flush = () => {
      raf = 0
      if (pending === null) return
      // Skip re-rendering the whole dial for changes the eye cannot see (< 0.25 degrees).
      if (lastShown === null || Math.abs(pending - lastShown) >= 0.25) {
        lastShown = pending
        setHeading(pending)
      }
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
      const dg = diagRef.current
      if (fromAbsoluteEvent) dg.absoluteEvents += 1
      else dg.relativeEvents += 1
      dg.lastType = fromAbsoluteEvent ? 'deviceorientationabsolute' : 'deviceorientation'
      dg.alpha = typeof e.alpha === 'number' ? e.alpha : null
      dg.beta = typeof e.beta === 'number' ? e.beta : null
      dg.gamma = typeof e.gamma === 'number' ? e.gamma : null
      dg.eventAbsoluteFlag = typeof e.absolute === 'boolean' ? e.absolute : null
      dg.webkitHeading = typeof e.webkitCompassHeading === 'number' ? e.webkitCompassHeading : null
      dg.webkitAccuracy = typeof e.webkitCompassAccuracy === 'number' ? e.webkitCompassAccuracy : null
      dg.eulerHeading =
        dg.alpha !== null && dg.beta !== null && dg.gamma !== null ? headingFromEuler(dg.alpha, dg.beta, dg.gamma, currentScreenAngle()) : null

      // 1) iOS: webkitCompassHeading is a ready-made magnetic heading of the device top.
      if (typeof e.webkitCompassHeading === 'number' && Number.isFinite(e.webkitCompassHeading) && e.webkitCompassHeading >= 0) {
        if (typeof e.webkitCompassAccuracy === 'number') setLowAccuracy(e.webkitCompassAccuracy < 0 || e.webkitCompassAccuracy > 25)
        if (declination === null) {
          // No reliable declination: the magnetic heading cannot be corrected
          // to true north, so never present it as a confident qibla reading.
          filter.reset()
          pending = null
          lastShown = null
          setHeading(null)
          setStatus('active')
          setDeclinationUnknown(true)
          return
        }
        publish(normalize360(e.webkitCompassHeading + declination + currentScreenAngle()))
        return
      }

      // 2) Android/Chrome: only north-referenced (absolute) Euler angles are a compass.
      if (!fromAbsoluteEvent && absoluteEventSeen) return
      if (!(fromAbsoluteEvent || e.absolute === true)) return
      if (typeof e.alpha !== 'number' || typeof e.beta !== 'number' || typeof e.gamma !== 'number') return
      if (fromAbsoluteEvent) absoluteEventSeen = true
      const h = headingFromEuler(e.alpha, e.beta, e.gamma, currentScreenAngle())
      if (h === null || !Number.isFinite(h)) {
        // Face-down or degenerate pose: never keep showing a stale heading as
        // valid. A short streak avoids flicker on single dropped/odd samples.
        nullStreak += 1
        if (nullStreak >= 3) {
          filter.reset()
          pending = null
          lastShown = null
          setHeading(null)
          setInvalidPose(true)
        }
        return
      }
      nullStreak = 0
      setInvalidPose(false)

      // Android accuracy alert: flag a wildly oscillating raw stream so the user
      // calibrates instead of trusting a trembling needle.
      const now = performance.now()
      const buf = jitterRef.current
      buf.push({ t: now, h })
      while (buf.length > 40 || (buf.length > 1 && now - buf[0].t > JITTER_WINDOW_MS)) buf.shift()
      if (buf.length >= JITTER_MIN_SAMPLES) {
        let sumAbs = 0
        let sum = 0
        for (let i = 1; i < buf.length; i++) {
          const d = shortestDelta(buf[i].h, buf[i - 1].h)
          sumAbs += Math.abs(d)
          sum += d
        }
        // Direction inconsistency, not motion amplitude: a smooth deliberate
        // turn keeps every delta on the same sign, so sumAbs ~= |sum| and the
        // residual stays ~0 no matter how far the user rotated. Only a stream
        // that keeps flipping sign (trembling readings) builds a residual.
        const n = buf.length - 1
        const instability = sumAbs / n - Math.abs(sum / n)
        setFluctuating((prev) => (instability > JITTER_ON_DEG ? true : instability < JITTER_OFF_DEG ? false : prev))
      }

      publish(h)
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
  }, [stop, declination])

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
      window.clearTimeout(calibrationTimerRef.current)
      stop()
    }
  }, [start, stop])

  const onCalibrate = () => {
    // The OS owns magnetometer calibration; this restarts the reading and
    // shows the figure-eight guidance while the sensor settles again.
    setCalibrationHint(true)
    window.clearTimeout(calibrationTimerRef.current)
    calibrationTimerRef.current = window.setTimeout(() => setCalibrationHint(false), 8000)
    void enable()
  }

  const active = status === 'active' && heading !== null
  const rotation = active ? needleRotation(bearing, heading) : 0
  const aligned = active && Math.abs(shortestDelta(bearing, normalize360(heading))) <= 4

  // Accessibility + haptics on alignment: announce entering the qibla direction
  // once per entry, and give a short vibration only when the app's vibration
  // setting (shared with the tasbih) is on.
  useEffect(() => {
    if (aligned === alignedRef.current) return
    alignedRef.current = aligned
    setAlignedAnnounce(aligned ? 'أنت الآن باتجاه القبلة' : '')
    if (
      aligned &&
      readSetting(APP_SETTINGS_KEYS.vibration, '1') !== '0' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      navigator.vibrate([10, 18, 10])
    }
  }, [aligned])

  const statusText = Capacitor.isNativePlatform() ? STATUS_TEXT_NATIVE : STATUS_TEXT_WEB
  let message = statusText[status] ?? ''
  if (declinationUnknown) message = 'لا يمكن حساب اتجاه القبلة بدقة في موقعك الحالي'
  else if (status === 'active' && invalidPose) message = 'الهاتف مقلوب على وجهه أو في وضع لا تظهر فيه الشاشة، أدره حتى تتضح القراءة'
  else if (status === 'active' && calibrationHint) message = 'حرّك الهاتف في الهواء على شكل الرقم 8 عدة مرات لمعايرة البوصلة'
  else if (status === 'active' && fluctuating) message = 'قراءات البوصلة غير مستقرة، ابتعد عن المعادن والمغناطيس وعاير الهاتف بتحريكه على شكل الرقم 8'
  else if (status === 'active' && lowAccuracy) message = 'دقة البوصلة منخفضة، ابتعد عن المعادن والمغناطيس'

  const dialLabel =
    heading === null
      ? 'بوصلة القبلة'
      : `بوصلة القبلة، اتجاهك الحالي ${Math.round(normalize360(heading))} درجة من الشمال، وزاوية القبلة ${Math.round(bearing)} درجة`

  return (
    <div className="q2-compass-shell">
      <div className={'q2-dial' + (aligned ? ' is-aligned' : '')} role="img" aria-label={dialLabel}>
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

        <svg className="q2-cardinals" viewBox="0 0 240 240" aria-hidden="true">
          {CARDINALS.map(({ deg, label }) => {
            const a = dialLabelAngle(deg, heading)
            return (
              <g key={deg} transform={`rotate(${a} 120 120)`}>
                <text x="120" y="46" className={'q2-cardinal' + (deg === 0 ? ' q2-cardinal-n' : '')} textAnchor="middle" dominantBaseline="central" transform={`rotate(${-a} 120 46)`}>
                  {label}
                </text>
              </g>
            )
          })}
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

      <p className="q2-bearing">
        القبلة باتجاه {directionName(bearing)} · زاوية القبلة <bdi className="q2-num">{Math.round(bearing)}°</bdi> من الشمال
        {heading !== null ? (
          <>
            {' · اتجاهك '}
            <bdi className="q2-num">{Math.round(normalize360(heading))}°</bdi>
          </>
        ) : (
          ''
        )}
      </p>

      <p className="q2-bearing" data-testid="q2-distance">
        المسافة إلى مكة المكرمة نحو <bdi className="q2-num">{Math.round(distanceToKaabaKm(coords.lat, coords.lng)).toLocaleString('ar-EG')}</bdi> كم
      </p>

      <p className="q2-status" aria-live="polite">{message}</p>
      <span className="q2-sr-only" role="status">{alignedAnnounce}</span>

      <button type="button" onClick={onCalibrate} aria-label={status === 'needs-permission' ? 'تفعيل البوصلة' : status === 'active' || status === 'waiting' ? 'معايرة البوصلة' : 'إعادة المحاولة'} className="q2-calibrate u-pressable">
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        <span>{status === 'needs-permission' ? 'تفعيل' : status === 'denied' || status === 'unavailable' || status === 'no-absolute' || status === 'insecure' ? 'إعادة المحاولة' : 'معايرة'}</span>
      </button>
      <CompassDiagnostics getSnapshot={getDiag} coords={coords} declination={declination} />
    </div>
  )
}
