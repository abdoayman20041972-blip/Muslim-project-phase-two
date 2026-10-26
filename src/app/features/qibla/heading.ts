const D2R = Math.PI / 180
const R2D = 180 / Math.PI

/** Phone is treated as "flat" when its screen normal is within ~53° of vertical. */
const FLAT_THRESHOLD = 0.6

export const normalize360 = (deg: number) => ((deg % 360) + 360) % 360

/** Signed shortest rotation from `from` to `to`, in [-180, 180). */
export const shortestDelta = (to: number, from: number) => (((to - from + 540) % 360) + 360) % 360 - 180

/** Current screen rotation (0/90/180/270) relative to the device's natural orientation. */
export function currentScreenAngle(): number {
  if (typeof window === 'undefined') return 0
  const modern = window.screen?.orientation?.angle
  if (typeof modern === 'number') return normalize360(modern)
  const legacy = (window as unknown as { orientation?: number }).orientation
  return typeof legacy === 'number' ? normalize360(legacy) : 0
}

/**
 * Compass heading (0° = north, clockwise) of the direction the user is "facing",
 * from W3C Z-X'-Y'' Euler angles that are relative to magnetic north
 * (i.e. from `deviceorientationabsolute` or an event with `absolute === true`).
 *
 * - Phone flat (screen facing up): heading of the top of the screen (UI-up), which
 *   already accounts for screen rotation via `screenDeg` — apply it only here, once.
 * - Phone upright: heading of the rear camera direction (-Z axis), which does not
 *   depend on screen rotation, so no extra compensation is applied.
 *
 * Returns null when the heading is undefined.
 */
export function headingFromEuler(alpha: number, beta: number, gamma: number, screenDeg = 0): number | null {
  const a = alpha * D2R
  const b = beta * D2R
  const g = gamma * D2R
  const cZ = Math.cos(a)
  const sZ = Math.sin(a)
  const cX = Math.cos(b)
  const sX = Math.sin(b)
  const cY = Math.cos(g)
  const sY = Math.sin(g)

  let east: number
  let north: number

  if (Math.abs(cX * cY) >= FLAT_THRESHOLD) {
    const t = screenDeg * D2R
    const st = Math.sin(t)
    const ct = Math.cos(t)
    // World-space (east, north) of the on-screen "up" vector: st * deviceX + ct * deviceY
    east = st * (cZ * cY - sZ * sX * sY) + ct * (-sZ * cX)
    north = st * (sZ * cY + cZ * sX * sY) + ct * (cZ * cX)
  } else {
    // World-space (east, north) of the rear camera direction (-deviceZ)
    east = -(cZ * sY + sZ * sX * cY)
    north = -(sZ * sY - cZ * sX * cY)
  }

  if (Math.hypot(east, north) < 1e-6) return null
  return normalize360(Math.atan2(east, north) * R2D)
}

/** Needle rotation on screen: qibla bearing minus the (continuous) phone heading. */
export const needleRotation = (bearing: number, unwrappedHeading: number) => bearing - unwrappedHeading

/**
 * Time-based exponential smoothing on the unit vector (no wrap-around artefacts),
 * returning a continuous (unwrapped) angle so 359° → 0° never spins the long way.
 */
export function createHeadingFilter(tauMs = 140) {
  let sx = 0
  let sy = 0
  let last = 0
  let ready = false
  let unwrapped = 0
  let prevAngle = 0

  return {
    push(deg: number, nowMs: number): number {
      const r = deg * D2R
      const x = Math.cos(r)
      const y = Math.sin(r)
      if (!ready) {
        sx = x
        sy = y
        last = nowMs
        ready = true
        prevAngle = normalize360(deg)
        unwrapped = prevAngle
        return unwrapped
      }
      const dt = Math.max(0, nowMs - last)
      last = nowMs
      const k = 1 - Math.exp(-dt / tauMs)
      sx += (x - sx) * k
      sy += (y - sy) * k
      if (Math.hypot(sx, sy) < 0.05) {
        sx = x
        sy = y
      }
      const angle = normalize360(Math.atan2(sy, sx) * R2D)
      unwrapped += shortestDelta(angle, prevAngle)
      prevAngle = angle
      return unwrapped
    },
    reset() {
      ready = false
    },
  }
}
