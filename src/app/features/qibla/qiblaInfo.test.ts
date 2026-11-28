import { describe, expect, it } from 'vitest'
import { directionName, distanceToKaabaKm } from './qiblaInfo'

describe('qibla info', () => {
  it('computes the distance to the Kaaba (Cairo about 1,280 km, London about 4,800 km)', () => {
    expect(distanceToKaabaKm(30.0444, 31.2357)).toBeGreaterThan(1250)
    expect(distanceToKaabaKm(30.0444, 31.2357)).toBeLessThan(1320)
    expect(distanceToKaabaKm(51.5074, -0.1278)).toBeGreaterThan(4700)
    expect(distanceToKaabaKm(51.5074, -0.1278)).toBeLessThan(4900)
    expect(distanceToKaabaKm(21.4225, 39.8262)).toBeLessThan(0.01)
  })
  it('names the 8 directions and wraps around north', () => {
    expect(directionName(0)).toBe('شمال')
    expect(directionName(359)).toBe('شمال')
    expect(directionName(136)).toBe('جنوب شرق')
    expect(directionName(180)).toBe('جنوب')
    expect(directionName(-90)).toBe('غرب')
    expect(directionName(315)).toBe('شمال غرب')
    expect(directionName(360 + 90)).toBe('شرق')
  })
})
