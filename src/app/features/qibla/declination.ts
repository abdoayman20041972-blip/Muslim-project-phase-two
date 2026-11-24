/**
 * Magnetic declination (degrees, east-positive) from the World Magnetic Model 2025.
 *
 * The coefficient table below is the official NOAA/NCEI WMM2025 release
 * (epoch 2025.0, valid late 2024 through end of 2029; released 2024-12-17,
 * public domain, https://www.ncei.noaa.gov/products/world-magnetic-model).
 * The spherical-harmonic evaluation follows the WMM Technical Report algorithm
 * and matches NOAA's published WMM2025 test values to within 0.005 deg
 * (see declination.test.ts). Fully offline: no network, no external model file.
 *
 * Declination here means: true_north_heading = magnetic_heading + declination.
 *
 * Returns null when no reliable declination exists: a date outside the model's
 * official 2025-2029 validity window, non-finite or out-of-range coordinates,
 * or the polar blackout zones where declination is physically undefined.
 * Callers must treat null as "unknown" and never fall back to zero.
 */

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

/** WMM reference radius in km. */
const A_REF = 6371.2
/** WGS84 equatorial radius in km. */
const WGS84_A = 6378.137
const WGS84_F = 1 / 298.257223563
const WGS84_E2 = WGS84_F * (2 - WGS84_F)

const EPOCH = 2025.0
const NMAX = 12

/** [n, m, g (nT), h (nT), g_dot (nT/yr), h_dot (nT/yr)] at the 2025.0 epoch. */
const COEFFS: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [1, 0, -29351.8, 0.0, 12.0, 0.0],
  [1, 1, -1410.8, 4545.4, 9.7, -21.5],
  [2, 0, -2556.6, 0.0, -11.6, 0.0],
  [2, 1, 2951.1, -3133.6, -5.2, -27.7],
  [2, 2, 1649.3, -815.1, -8.0, -12.1],
  [3, 0, 1361.0, 0.0, -1.3, 0.0],
  [3, 1, -2404.1, -56.6, -4.2, 4.0],
  [3, 2, 1243.8, 237.5, 0.4, -0.3],
  [3, 3, 453.6, -549.5, -15.6, -4.1],
  [4, 0, 895.0, 0.0, -1.6, 0.0],
  [4, 1, 799.5, 278.6, -2.4, -1.1],
  [4, 2, 55.7, -133.9, -6.0, 4.1],
  [4, 3, -281.1, 212.0, 5.6, 1.6],
  [4, 4, 12.1, -375.6, -7.0, -4.4],
  [5, 0, -233.2, 0.0, 0.6, 0.0],
  [5, 1, 368.9, 45.4, 1.4, -0.5],
  [5, 2, 187.2, 220.2, 0.0, 2.2],
  [5, 3, -138.7, -122.9, 0.6, 0.4],
  [5, 4, -142.0, 43.0, 2.2, 1.7],
  [5, 5, 20.9, 106.1, 0.9, 1.9],
  [6, 0, 64.4, 0.0, -0.2, 0.0],
  [6, 1, 63.8, -18.4, -0.4, 0.3],
  [6, 2, 76.9, 16.8, 0.9, -1.6],
  [6, 3, -115.7, 48.8, 1.2, -0.4],
  [6, 4, -40.9, -59.8, -0.9, 0.9],
  [6, 5, 14.9, 10.9, 0.3, 0.7],
  [6, 6, -60.7, 72.7, 0.9, 0.9],
  [7, 0, 79.5, 0.0, -0.0, 0.0],
  [7, 1, -77.0, -48.9, -0.1, 0.6],
  [7, 2, -8.8, -14.4, -0.1, 0.5],
  [7, 3, 59.3, -1.0, 0.5, -0.8],
  [7, 4, 15.8, 23.4, -0.1, 0.0],
  [7, 5, 2.5, -7.4, -0.8, -1.0],
  [7, 6, -11.1, -25.1, -0.8, 0.6],
  [7, 7, 14.2, -2.3, 0.8, -0.2],
  [8, 0, 23.2, 0.0, -0.1, 0.0],
  [8, 1, 10.8, 7.1, 0.2, -0.2],
  [8, 2, -17.5, -12.6, 0.0, 0.5],
  [8, 3, 2.0, 11.4, 0.5, -0.4],
  [8, 4, -21.7, -9.7, -0.1, 0.4],
  [8, 5, 16.9, 12.7, 0.3, -0.5],
  [8, 6, 15.0, 0.7, 0.2, -0.6],
  [8, 7, -16.8, -5.2, -0.0, 0.3],
  [8, 8, 0.9, 3.9, 0.2, 0.2],
  [9, 0, 4.6, 0.0, -0.0, 0.0],
  [9, 1, 7.8, -24.8, -0.1, -0.3],
  [9, 2, 3.0, 12.2, 0.1, 0.3],
  [9, 3, -0.2, 8.3, 0.3, -0.3],
  [9, 4, -2.5, -3.3, -0.3, 0.3],
  [9, 5, -13.1, -5.2, 0.0, 0.2],
  [9, 6, 2.4, 7.2, 0.3, -0.1],
  [9, 7, 8.6, -0.6, -0.1, -0.2],
  [9, 8, -8.7, 0.8, 0.1, 0.4],
  [9, 9, -12.9, 10.0, -0.1, 0.1],
  [10, 0, -1.3, 0.0, 0.1, 0.0],
  [10, 1, -6.4, 3.3, 0.0, 0.0],
  [10, 2, 0.2, 0.0, 0.1, -0.0],
  [10, 3, 2.0, 2.4, 0.1, -0.2],
  [10, 4, -1.0, 5.3, -0.0, 0.1],
  [10, 5, -0.6, -9.1, -0.3, -0.1],
  [10, 6, -0.9, 0.4, 0.0, 0.1],
  [10, 7, 1.5, -4.2, -0.1, 0.0],
  [10, 8, 0.9, -3.8, -0.1, -0.1],
  [10, 9, -2.7, 0.9, -0.0, 0.2],
  [10, 10, -3.9, -9.1, -0.0, -0.0],
  [11, 0, 2.9, 0.0, 0.0, 0.0],
  [11, 1, -1.5, 0.0, -0.0, -0.0],
  [11, 2, -2.5, 2.9, 0.0, 0.1],
  [11, 3, 2.4, -0.6, 0.0, -0.0],
  [11, 4, -0.6, 0.2, 0.0, 0.1],
  [11, 5, -0.1, 0.5, -0.1, -0.0],
  [11, 6, -0.6, -0.3, 0.0, -0.0],
  [11, 7, -0.1, -1.2, -0.0, 0.1],
  [11, 8, 1.1, -1.7, -0.1, -0.0],
  [11, 9, -1.0, -2.9, -0.1, 0.0],
  [11, 10, -0.2, -1.8, -0.1, 0.0],
  [11, 11, 2.6, -2.3, -0.1, 0.0],
  [12, 0, -2.0, 0.0, 0.0, 0.0],
  [12, 1, -0.2, -1.3, 0.0, -0.0],
  [12, 2, 0.3, 0.7, -0.0, 0.0],
  [12, 3, 1.2, 1.0, -0.0, -0.1],
  [12, 4, -1.3, -1.4, -0.0, 0.1],
  [12, 5, 0.6, -0.0, -0.0, -0.0],
  [12, 6, 0.6, 0.6, 0.1, -0.0],
  [12, 7, 0.5, -0.1, -0.0, -0.0],
  [12, 8, -0.1, 0.8, 0.0, 0.0],
  [12, 9, -0.4, 0.1, 0.0, -0.0],
  [12, 10, -0.2, -1.0, -0.1, -0.0],
  [12, 11, -1.3, 0.1, -0.0, 0.0],
  [12, 12, -0.7, 0.2, -0.1, -0.1],
]

/** Decimal year for a date (UTC), e.g. 2026.9. */
export function decimalYear(date: Date): number {
  const year = date.getUTCFullYear()
  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year + 1, 0, 1)
  return year + (date.getTime() - start) / (end - start)
}

/**
 * Magnetic declination in degrees (positive = magnetic north east of true north)
 * at a WGS84 geodetic position, height 0, evaluated at `year` (decimal years).
 * Accurate within the WMM2025 validity window (2025.0 - end of 2029); dates far
 * outside it are still evaluated but the linear secular drift degrades.
 */
export function magneticDeclination(latDeg: number, lngDeg: number, date: Date = new Date()): number | null {
  const year = decimalYear(date)
  // Unsupported inputs must never yield a confident-looking correction:
  // impossible coordinates, a broken clock, or a date outside the model's
  // official validity window (WMM2025: 2025.0 through the end of 2029) mean
  // "unknown", not zero.
  if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) return null
  if (Math.abs(latDeg) > 90) return null
  if (!Number.isFinite(year) || year < EPOCH || year >= EPOCH + 5) return null
  // WGS84 geodetic -> geocentric spherical at height 0.
  const phi = latDeg * D2R
  const sphi = Math.sin(phi)
  const cphi = Math.cos(phi)
  const rc = WGS84_A / Math.sqrt(1 - WGS84_E2 * sphi * sphi)
  const p = rc * cphi
  const zz = rc * (1 - WGS84_E2) * sphi
  const r = Math.hypot(p, zz)
  const phic = Math.atan2(zz, p)
  const theta = Math.PI / 2 - phic
  const lon = lngDeg * D2R

  // Schmidt quasi-normalized associated Legendre P[n][m](cos theta), dP/dtheta.
  const ct = Math.cos(theta)
  const st = Math.sin(theta)
  const P: number[][] = []
  const dP: number[][] = []
  for (let n = 0; n <= NMAX; n++) {
    P.push(new Array(NMAX + 1).fill(0))
    dP.push(new Array(NMAX + 1).fill(0))
  }
  P[0][0] = 1
  for (let n = 1; n <= NMAX; n++) {
    for (let m = 0; m <= n; m++) {
      if (n === m) {
        if (n === 1) {
          P[1][1] = st
          dP[1][1] = ct
        } else {
          const k = Math.sqrt((2 * n - 1) / (2 * n))
          P[n][n] = k * st * P[n - 1][n - 1]
          dP[n][n] = k * (st * dP[n - 1][n - 1] + ct * P[n - 1][n - 1])
        }
      } else {
        const d = Math.sqrt(n * n - m * m)
        const k1 = (2 * n - 1) / d
        const k2 = Math.sqrt((n - 1) * (n - 1) - m * m) / d
        const p2 = n - 2 >= m ? P[n - 2][m] : 0
        const dp2 = n - 2 >= m ? dP[n - 2][m] : 0
        P[n][m] = k1 * ct * P[n - 1][m] - k2 * p2
        dP[n][m] = k1 * (ct * dP[n - 1][m] - st * P[n - 1][m]) - k2 * dp2
      }
    }
  }

  const cm = new Array(NMAX + 1)
  const sm = new Array(NMAX + 1)
  for (let m = 0; m <= NMAX; m++) {
    cm[m] = Math.cos(m * lon)
    sm[m] = Math.sin(m * lon)
  }

  // Gauss coefficients at the requested epoch plus secular drift.
  const g: number[][] = []
  const h: number[][] = []
  for (let n = 0; n <= NMAX; n++) {
    g.push(new Array(NMAX + 1).fill(0))
    h.push(new Array(NMAX + 1).fill(0))
  }
  const dt = year - EPOCH
  for (const [n, m, gn, hn, gd, hd] of COEFFS) {
    g[n][m] = gn + dt * gd
    h[n][m] = hn + dt * hd
  }

  // Geocentric field: X' north, Y east, Z' down (nT).
  let Xp = 0
  let Y = 0
  let Zp = 0
  for (let n = 1; n <= NMAX; n++) {
    const ar = Math.pow(A_REF / r, n + 2)
    for (let m = 0; m <= n; m++) {
      const gc = g[n][m] * cm[m] + h[n][m] * sm[m]
      Xp += ar * gc * dP[n][m]
      Y += ar * m * (g[n][m] * sm[m] - h[n][m] * cm[m]) * P[n][m]
      Zp -= ar * (n + 1) * gc * P[n][m]
    }
  }
  if (Math.abs(st) > 1e-10) Y /= st

  // Rotate geocentric into the geodetic frame (psi = geocentric - geodetic lat).
  const psi = phic - phi
  const X = Xp * Math.cos(psi) - Zp * Math.sin(psi)

  // Near the magnetic poles the horizontal field vanishes and declination is
  // physically undefined (WMM "blackout zones"). Returning any number here,
  // even zero, would fabricate a plausible correction, so report "unknown"
  // and let the caller avoid showing a confidently aligned heading.
  if (Math.hypot(X, Y) < 1000) return null

  return Math.atan2(Y, X) * R2D
}
