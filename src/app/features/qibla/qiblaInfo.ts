import { normalize360 } from './heading'

const KAABA = { lat: 21.4225, lng: 39.8262 }
const rad = (v: number) => (v * Math.PI) / 180

/** Great-circle (haversine) distance in km from a point to the Kaaba. */
export function distanceToKaabaKm(lat: number, lng: number): number {
  const dLat = rad(KAABA.lat - lat)
  const dLng = rad(KAABA.lng - lng)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(KAABA.lat)) * Math.sin(dLng / 2) ** 2
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const NAMES = ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب']

/** Arabic 8-point direction name for a true-north bearing in degrees. */
export function directionName(bearingDeg: number): string {
  return NAMES[Math.round(normalize360(bearingDeg) / 45) % 8]
}

/** Heading changes below this many degrees are not worth re-rendering the dial for. */
export const HEADING_RENDER_STEP_DEG = 0.25

/** True when the dial should re-render: nothing shown yet, or the change is large enough to see. */
export function shouldRenderHeading(lastShown: number | null, next: number): boolean {
  return lastShown === null || Math.abs(next - lastShown) >= HEADING_RENDER_STEP_DEG
}
