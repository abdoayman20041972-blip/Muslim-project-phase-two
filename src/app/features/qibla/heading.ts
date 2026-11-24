const D2R = Math.PI / 180
const R2D = 180 / Math.PI

/** Screen-normal vertical component at or below which the phone is treated as face-down. */
const FACE_DOWN_GUARD = -0.65

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
 * One continuous facing reference for every pose, so no threshold crossing can
 * flip the needle:
 * - Primary: horizontal projection of the on-screen "up" vector (device axes
 *   combined via `screenDeg` — the rotation compensation is applied only here,
 *   once). This is the familiar "top of the screen" heading when the phone is
 *   held flat(-ish).
 * - As that projection degenerates near upright poses, the rear camera axis
 *   (-Z) takes over, weighted by how much of the primary projection remains.
 *   The camera axis is sign-chosen by the vertical component of the on-screen
 *   "up" vector: -Z when the screen faces the user (top above the horizon),
 *   +Z when it faces away (upside-down vertical), which is the unique choice
 *   that stays continuous with the flat-side heading on both tilt directions.
 *   The sign flips only where the primary projection is already full-weight,
 *   so the flip itself is invisible.
 *
 * Returns null when the heading is undefined: the phone is face-down
 * (screen normal points down past the guard), or the pose is degenerate -
 * in the band where the screen faces below the horizon but not yet fully down,
 * the two references physically oppose each other (the user cannot see the
 * screen), so their blend cancels; that pose has no meaningful facing and is
 * reported as null instead of an unstable heading.
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

  // Vertical component of the screen normal (device Z): +1 flat screen-up, -1 face-down.
  if (cX * cY <= FACE_DOWN_GUARD) return null

  // World-space (east, north) horizontal projections of the device axes.
  const xE = cZ * cY - sZ * sX * sY
  const xN = sZ * cY + cZ * sX * sY
  const yE = -sZ * cX
  const yN = cZ * cX
  const zE = cZ * sY + sZ * sX * cY
  const zN = sZ * sY - cZ * sX * cY

  // Primary reference: horizontal projection of the on-screen "up" vector.
  const t = screenDeg * D2R
  const st = Math.sin(t)
  const ct = Math.cos(t)
  const pE = st * xE + ct * yE
  const pN = st * xN + ct * yN
  const pMag = Math.hypot(pE, pN)

  // Camera reference with the continuity sign (see the function comment).
  const upOnScreen = -st * cX * sY + ct * sX
  const sign = upOnScreen >= 0 ? -1 : 1
  const rE = sign * zE
  const rN = sign * zN

  // Blend: primary where its projection is meaningful, camera near upright.
  const wCam = Math.max(0, 1 - pMag)
  const east = pE + wCam * rE
  const north = pN + wCam * rN

  const fMag = Math.hypot(east, north)
  const sources = pMag + wCam * Math.hypot(rE, rN)
  // Degenerate blend: the references cancelled (screen facing down-ish).
  if (fMag < 1e-6 || (sources > 1e-9 && fMag < 0.5 * sources)) return null
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
