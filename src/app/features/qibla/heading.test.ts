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
