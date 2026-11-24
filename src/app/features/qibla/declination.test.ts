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

describe('magneticDeclination (WMM2025)', () => {
  it('matches the official NOAA WMM2025 test values within 0.02°', () => {
    for (const [year, lat, lon, expected] of OFFICIAL) {
      expect(Math.abs(magneticDeclination(lat, lon, atYear(year)) - expected)).toBeLessThan(0.02)
    }
  })

  it('decimalYear round-trips through the date helper', () => {
    expect(decimalYear(atYear(2026.9))).toBeCloseTo(2026.9, 6)
  })

  it('Cairo is about +4.8° east in 2026 (magnetic north east of true north)', () => {
    const d = magneticDeclination(30.0444, 31.2357, atYear(2026.9))
    expect(d).toBeGreaterThan(4.6)
    expect(d).toBeLessThan(5.0)
  })

  it('resolves negative and near-zero declination cities correctly', () => {
    // New York: strongly negative (west).
    const nyc = magneticDeclination(40.7128, -74.006, atYear(2026.9))
    expect(nyc).toBeGreaterThan(-13.5)
    expect(nyc).toBeLessThan(-11.5)
    // Jakarta: near zero.
    const jakarta = magneticDeclination(-6.2088, 106.8456, atYear(2026.9))
    expect(Math.abs(jakarta)).toBeLessThan(1.2)
    // Sydney: strongly positive (east).
    const sydney = magneticDeclination(-33.8688, 151.2093, atYear(2026.9))
    expect(sydney).toBeGreaterThan(12)
    expect(sydney).toBeLessThan(14)
  })

  it('true-north conversion is magnetic + declination', () => {
    // In Cairo, a sensor pointing at true qibla (136.14°) reads ~131.4° magnetic:
    // heading_true = heading_magnetic + declination ≈ 131.37 + 4.77.
    const d = magneticDeclination(30.0444, 31.2357, atYear(2026.9))
    expect(131.37 + d).toBeCloseTo(136.14, 0)
  })
})
