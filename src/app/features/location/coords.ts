import { useEffect, useState } from 'react'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'

export type Coords = { lat: number; lng: number }

export function normalizeCoords(value: unknown): Coords | null {
  const lat = Number((value as { lat?: unknown })?.lat)
  const lng = Number((value as { lng?: unknown })?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat: Number(lat.toFixed(2)), lng: Number(lng.toFixed(2)) }
}

export function readStoredCoords(): Coords | null {
  try {
    return normalizeCoords(JSON.parse(readSetting(APP_SETTINGS_KEYS.coords, 'null')))
  } catch {
    return null
  }
}

export function useLocationCoords() {
  const [coords, setCoords] = useState<Coords | null>(readStoredCoords)

  useEffect(() => {
    const refresh = () => {
      setCoords((previous) => {
        const next = readStoredCoords()
        return previous?.lat === next?.lat && previous?.lng === next?.lng ? previous : next
      })
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('azkar-prayer-settings-changed', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('azkar-prayer-settings-changed', refresh)
    }
  }, [])

  return coords
}
