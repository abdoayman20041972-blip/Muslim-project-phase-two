import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { normalizeCoords, type Coords } from './coords'

export type LocationFailure = 'permission-denied' | 'services-disabled' | 'timeout' | 'unavailable' | 'unsupported'

export type LocationResult =
  | { ok: true; coords: Coords; source: 'recent' | 'high-accuracy' | 'browser' }
  | { ok: false; reason: LocationFailure; detail: string }

const fail = (reason: LocationFailure, detail: string): LocationResult => ({ ok: false, reason, detail })

/** Android 12+ lets the user grant only "approximate" location; that is enough for prayer times. */
export const isLocationPermissionGranted = (permission: { location?: string; coarseLocation?: string }) =>
  permission.location === 'granted' || permission.coarseLocation === 'granted'

function classify(error: unknown): { reason: LocationFailure; detail: string } {
  const raw = error as { message?: unknown; code?: unknown } | null
  const detail = typeof raw?.message === 'string' ? raw.message : String(error)
  const text = detail.toLowerCase()
  if (raw?.code === 1 || /denied|permission/.test(text)) return { reason: 'permission-denied', detail }
  if (/not enabled|disabled|services/.test(text)) return { reason: 'services-disabled', detail }
  if (raw?.code === 3 || /timeout|timed out/.test(text)) return { reason: 'timeout', detail }
  return { reason: 'unavailable', detail }
}

// A cached fix is accepted first (instant, works indoors); only then a fresh
// high-accuracy fix with a longer wait. Retrying cannot fix a denied permission
// or a switched-off GPS, so those stop the chain immediately.
const NATIVE_ATTEMPTS = [
  { source: 'recent', options: { enableHighAccuracy: false, timeout: 8_000, maximumAge: 10 * 60_000 } },
  { source: 'high-accuracy', options: { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 } },
] as const

async function acquireNative(): Promise<LocationResult> {
  try {
    let permission = await Geolocation.checkPermissions()
    if (!isLocationPermissionGranted(permission)) permission = await Geolocation.requestPermissions()
    if (!isLocationPermissionGranted(permission)) return fail('permission-denied', 'permission not granted')
  } catch (error) {
    const failure = classify(error)
    console.error('[location] permission step failed', error)
    return fail(failure.reason, failure.detail)
  }
  let last = fail('unavailable', 'no attempt was made')
  for (const attempt of NATIVE_ATTEMPTS) {
    try {
      const position = await Geolocation.getCurrentPosition(attempt.options)
      const coords = normalizeCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
      if (coords) return { ok: true, coords, source: attempt.source }
      last = fail('unavailable', 'the device returned invalid coordinates')
    } catch (error) {
      const failure = classify(error)
      console.warn('[location]', attempt.source, 'attempt failed:', failure.detail)
      last = fail(failure.reason, failure.detail)
      if (failure.reason === 'permission-denied' || failure.reason === 'services-disabled') return last
    }
  }
  return last
}

function acquireBrowser(): Promise<LocationResult> {
  if (!('geolocation' in navigator)) return Promise.resolve(fail('unsupported', 'navigator.geolocation is missing'))
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = normalizeCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
        resolve(coords ? { ok: true, coords, source: 'browser' } : fail('unavailable', 'invalid coordinates'))
      },
      (error) => {
        const failure = classify(error)
        resolve(fail(failure.reason, failure.detail))
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  })
}

/** One entry point for every screen that needs the user's position. Never throws. */
export function acquireLocation(): Promise<LocationResult> {
  return Capacitor.isNativePlatform() ? acquireNative() : acquireBrowser()
}

const MESSAGES: Record<LocationFailure, string> = {
  'permission-denied': 'تم رفض إذن الموقع. فعّله من إعدادات النظام أو اختر مدينتك يدويًا.',
  'services-disabled': 'خدمة الموقع (GPS) مغلقة على جهازك. فعّلها ثم أعد المحاولة، أو اختر مدينتك يدويًا.',
  timeout: 'استغرق تحديد الموقع وقتًا طويلًا. جرّب في مكان مفتوح أو اختر مدينتك يدويًا.',
  unavailable: 'تعذّر تحديد موقعك الآن. أعد المحاولة أو اختر مدينتك يدويًا.',
  unsupported: 'المتصفح لا يدعم تحديد الموقع. اختر مدينتك يدويًا.',
}

export const locationFailureMessage = (reason: LocationFailure) => MESSAGES[reason]
