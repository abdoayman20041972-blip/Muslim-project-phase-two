import { describe, expect, it } from 'vitest'
import { decimalYear, magneticDeclination } from './declination'

// Official NOAA WMM2025 test values (WMM2025_TEST_VALUES.txt, epoch file
// released 2024-12-17): date, lat, lon, expected declination in degrees.
const OFFICIAL: Array<[number, number, number, number]> = [
  [2025.0, 80, 0, 1.28],
  [2025.0, 0, 120, -0.16],
  [2025.0, -80, 240, 68.78],
  [2027.5, 80, 0, 2.59],
  [2027.5, 0, 120, -0.24],
  [2027.5, -80, 240, 68.49],
]

const atYear = (year: number) => {
  // Convert a decimal year back to a Date close enough for decimalYear().
  const y = Math.floor(year)
  const start = Date.UTC(y, 0, 1)
  const end = Date.UTC(y + 1, 0, 1)
  return new Date(start + (year - y) * (end - start))
}

const decl = (lat: number, lon: number, year: number): number => {
  const d = magneticDeclination(lat, lon, atYear(year))
  expect(d).not.toBeNull()
  return d as number
}

describe('magneticDeclination (WMM2025)', () => {
  it('matches the official NOAA WMM2025 test values within 0.02°', () => {
    for (const [year, lat, lon, expected] of OFFICIAL) {
      expect(Math.abs(decl(lat, lon, year) - expected)).toBeLessThan(0.02)
    }
  })

  it('decimalYear round-trips through the date helper', () => {
    expect(decimalYear(atYear(2026.9))).toBeCloseTo(2026.9, 6)
  })

  it('Cairo is about +4.8° east in 2026 (magnetic north east of true north)', () => {
    const d = decl(30.0444, 31.2357, 2026.9)
    expect(d).toBeGreaterThan(4.6)
    expect(d).toBeLessThan(5.0)
  })

  it('resolves negative and near-zero declination cities correctly', () => {
    // New York: strongly negative (west).
    const nyc = decl(40.7128, -74.006, 2026.9)
    expect(nyc).toBeGreaterThan(-13.5)
    expect(nyc).toBeLessThan(-11.5)
    // Jakarta: near zero.
    const jakarta = decl(-6.2088, 106.8456, 2026.9)
    expect(Math.abs(jakarta)).toBeLessThan(1.2)
    // Sydney: strongly positive (east).
    const sydney = decl(-33.8688, 151.2093, 2026.9)
    expect(sydney).toBeGreaterThan(12)
    expect(sydney).toBeLessThan(14)
  })

  it('true-north conversion is magnetic + declination', () => {
    // In Cairo, a sensor pointing at true qibla (136.14°) reads ~131.4° magnetic:
    // heading_true = heading_magnetic + declination ≈ 131.37 + 4.77.
    const d = decl(30.0444, 31.2357, 2026.9)
    expect(131.37 + d).toBeCloseTo(136.14, 0)
  })
})

describe('magneticDeclination unsupported states', () => {
  it('returns null near the magnetic poles (horizontal-field blackout)', () => {
    // WMM2025 north dip-pole region (near 84°N, 140°E): the horizontal field collapses
    // and declination is physically undefined. Zero would be a fabricated
    // correction, so the answer must be null. Irrelevant at inhabited
    // latitudes, but a wrong value here would silently rotate the needle.
    expect(magneticDeclination(84, 140, atYear(2026.9))).toBeNull()
  })

  it('returns null outside the official 2025-2029 validity window', () => {
    // Before release and after expiry the secular-drift extrapolation is not
    // reliable, so the model declines to answer rather than guess.
    expect(magneticDeclination(30.0444, 31.2357, atYear(2024.5))).toBeNull()
    expect(magneticDeclination(30.0444, 31.2357, atYear(2030.2))).toBeNull()
    // The edge of the window still works.
    expect(magneticDeclination(30.0444, 31.2357, atYear(2029.99))).not.toBeNull()
  })

  it('returns null for a broken clock', () => {
    expect(magneticDeclination(30.0444, 31.2357, new Date(NaN))).toBeNull()
  })

  it('returns null for non-finite or out-of-range coordinates', () => {
    expect(magneticDeclination(NaN, 31.2357, atYear(2026.9))).toBeNull()
    expect(magneticDeclination(30.0444, Infinity, atYear(2026.9))).toBeNull()
    expect(magneticDeclination(91, 0, atYear(2026.9))).toBeNull()
    expect(magneticDeclination(-95, 0, atYear(2026.9))).toBeNull()
  })
})
