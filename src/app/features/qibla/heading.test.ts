import { describe, expect, it } from 'vitest'
import { qiblaBearing } from './QiblaCompass'
import { createHeadingFilter, headingFromEuler, needleRotation, normalize360, shortestDelta } from './heading'

const near = (a: number | null, b: number, tol = 0.01) => {
  expect(a).not.toBeNull()
  expect(Math.abs(shortestDelta(a as number, b))).toBeLessThan(tol)
}

describe('qiblaBearing', () => {
  it('matches known bearings', () => {
    expect(qiblaBearing(30.0444, 31.2357)).toBeGreaterThan(135)
    expect(qiblaBearing(30.0444, 31.2357)).toBeLessThan(137.5)
    near(qiblaBearing(21.4225, 39.8262 - 1), 90, 1.5)
  })
})

describe('headingFromEuler', () => {
  it('flat phone: heading = 360 - alpha (top edge)', () => {
    near(headingFromEuler(0, 0, 0), 0)
    near(headingFromEuler(90, 0, 0), 270)
    near(headingFromEuler(270, 0, 0), 90)
    near(headingFromEuler(180, 0, 0), 180)
  })
  it('upright phone: heading of rear camera', () => {
    near(headingFromEuler(0, 90, 0), 0)
    near(headingFromEuler(90, 90, 0), 270)
    near(headingFromEuler(270, 90, 0), 90)
  })
  it('flat landscape: compensates screen angle exactly once', () => {
    near(headingFromEuler(0, 0, 0, 90), 90)
    near(headingFromEuler(90, 0, 0, 90), 0)
  })
  it('crosses 0/360 without a jump', () => {
    near(headingFromEuler(1, 0, 0), 359)
    near(headingFromEuler(359, 0, 0), 1)
  })
})

describe('headingFromEuler pose safety (stage-1 audit acceptance)', () => {
  it('backward tilt across the old 53° flat threshold no longer flips the needle', () => {
    // Reproduced from the audit: beta -52.9 → -53.3 used to jump +180° stably.
    const before = headingFromEuler(0, -52.9, -1)
    const after = headingFromEuler(0, -53.3, -1)
    near(after, before as number, 0.5)
  })
  it('is continuous across the whole old threshold region (no branch seam)', () => {
    // Dense scan around the former |cos(beta)*cos(gamma)| = 0.6 threshold surface
    // (beta within 60° of flat): neighbouring poses must differ by well under 2°.
    let maxDelta = 0
    for (let alpha = 0; alpha < 360; alpha += 15) {
      for (let beta = -60; beta <= 60; beta += 1) {
        for (let gamma = -85; gamma <= 85; gamma += 2) {
          const h = headingFromEuler(alpha, beta, gamma)
          if (h === null) continue
          for (const [db, dg] of [[1, 0], [0, 2]] as const) {
            const h2 = headingFromEuler(alpha, beta + db, gamma + dg)
            if (h2 === null) continue
            maxDelta = Math.max(maxDelta, Math.abs(shortestDelta(h2, h)))
          }
        }
      }
    }
    expect(maxDelta).toBeLessThan(1.8)
  })
  it('is continuous through all normal holding poses (flat to vertical)', () => {
    // Wider sweep, beta from upside-down-vertical through flat to portrait.
    // Residual deltas here are just yaw-like tracking where an Euler axis
    // degenerates at vertical poses (gamma doubles as yaw at beta = ±90),
    // not seams: the old defect was a stable 180° flip, which must stay gone.
    let maxDelta = 0
    for (let alpha = 0; alpha < 360; alpha += 15) {
      for (let beta = -90; beta <= 90; beta += 1) {
        for (let gamma = -85; gamma <= 85; gamma += 2) {
          const h = headingFromEuler(alpha, beta, gamma)
          if (h === null) continue
          for (const [db, dg] of [[1, 0], [0, 2]] as const) {
            const h2 = headingFromEuler(alpha, beta + db, gamma + dg)
            if (h2 === null) continue
            maxDelta = Math.max(maxDelta, Math.abs(shortestDelta(h2, h)))
          }
        }
      }
    }
    expect(maxDelta).toBeLessThan(2.5)
  })
  it('face-down poses produce no heading', () => {
    expect(headingFromEuler(0, 180, 0)).toBeNull()
    expect(headingFromEuler(0, -180, 0)).toBeNull()
    expect(headingFromEuler(45, 170, 40)).toBeNull()
  })
  it('degenerate screen-facing-down band produces no unstable heading', () => {
    // Past upside-down vertical the two references physically oppose each other;
    // the answer must be null, not a swinging value.
    expect(headingFromEuler(75, 118, -2)).toBeNull()
    expect(headingFromEuler(75, 118, 1)).toBeNull()
  })
  it('upside-down vertical keeps the flat-side heading (no 180° flip)', () => {
    near(headingFromEuler(0, -90, 0), 0)
    near(headingFromEuler(90, -90, 0), 270)
    // Approached continuously from the flat side:
    const seq = [-80, -85, -89, -90].map((b) => headingFromEuler(0, b, 0) as number)
    for (let i = 1; i < seq.length; i++) {
      expect(Math.abs(shortestDelta(seq[i], seq[i - 1]))).toBeLessThan(2)
    }
  })
  it('still tracks yaw 1:1 when flat', () => {
    near(headingFromEuler(30, 0, 0), 330)
    near(headingFromEuler(30, 10, -20), 330, 6)
  })
})

describe('needle', () => {
  it('rotates correctly for N/E/S/W headings (Cairo, bearing ~136)', () => {
    const b = 136
    expect(needleRotation(b, 0)).toBe(136)
    expect(needleRotation(b, 90)).toBe(46)
    expect(needleRotation(b, 180)).toBe(-44)
    expect(needleRotation(b, 270)).toBe(-134)
    expect(normalize360(needleRotation(b, b))).toBe(0)
  })
  it('needle rotation is continuous (no 360 jump) when heading crosses north', () => {
    const before = needleRotation(136, 359)
    const after = needleRotation(136, 361)
    expect(Math.abs(after - before + 2)).toBeLessThan(1e-9)
  })
  it('stays continuous across 359 -> 1', () => {
    const f = createHeadingFilter(140)
    const a = f.push(359, 0)
    const c = f.push(1, 2000)
    expect(c - a).toBeGreaterThan(1.5)
    expect(c - a).toBeLessThan(2.5)
    const d = f.push(359, 4000)
    expect(Math.abs(d - c + 2)).toBeLessThan(0.5)
  })
})
