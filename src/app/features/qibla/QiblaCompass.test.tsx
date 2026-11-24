import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { QiblaCompass, qiblaBearing } from './QiblaCompass'
import { shortestDelta } from './heading'

// Cairo: the pose the audit reproduced the 180° needle flip on.
const CAIRO = { lat: 30.0444, lng: 31.2357 }

function orientationEvent(alpha: number, beta: number, gamma: number): Event {
  const e = new Event('deviceorientationabsolute')
  Object.assign(e, { alpha, beta, gamma, absolute: true })
  return e
}

async function streamPose(alpha: number, beta: number, gamma: number, events = 8, gapMs = 45) {
  for (let i = 0; i < events; i++) {
    window.dispatchEvent(orientationEvent(alpha, beta, gamma))
    await new Promise((r) => setTimeout(r, gapMs))
  }
}

function needleRotationDeg(container: HTMLElement): number | null {
  const layer = container.querySelector<HTMLElement>('.q2-needle-layer.is-on')
  if (!layer) return null
  const m = /rotate\((-?[\d.]+)deg\)/.exec(layer.style.transform)
  return m ? Number(m[1]) : null
}

describe('QiblaCompass sensor stream', () => {
  beforeEach(() => {
    // jsdom has no DeviceOrientationEvent; stub one without requestPermission
    // so the component starts listening immediately (the Android path).
    vi.stubGlobal('DeviceOrientationEvent', class extends Event {})
  })

  it('keeps the needle stable while tilting backward through the old 53° threshold', async () => {
    const { container } = render(<QiblaCompass coords={CAIRO} />)
    await streamPose(0, 0, 0)
    const flat = await waitFor(() => {
      const r = needleRotationDeg(container)
      expect(r).not.toBeNull()
      return r as number
    })
    const bearing = qiblaBearing(CAIRO.lat, CAIRO.lng)
    expect(Math.abs(shortestDelta(bearing, flat))).toBeLessThan(3)

    await streamPose(0, -52.9, -1)
    const beforeThreshold = needleRotationDeg(container) as number
    await streamPose(0, -53.3, -1)
    const afterThreshold = needleRotationDeg(container) as number

    // The audit's repro jumped exactly +180° here and stayed wrong.
    expect(Math.abs(shortestDelta(afterThreshold, beforeThreshold))).toBeLessThan(5)
  })

  it('applies declination on the iOS webkitCompassHeading path', async () => {
    const { container } = render(<QiblaCompass coords={CAIRO} />)
    // A magnetic reading of ~131.4° plus Cairo's +4.8° declination lands on the
    // true qibla (~136.1°): the needle should settle at the top.
    for (let i = 0; i < 8; i++) {
      const e = new Event('deviceorientation')
      Object.assign(e, { webkitCompassHeading: 131.37, webkitCompassAccuracy: 10 })
      window.dispatchEvent(e)
      await new Promise((r) => setTimeout(r, 45))
    }
    await waitFor(() => {
      const r = needleRotationDeg(container)
      expect(r).not.toBeNull()
      expect(Math.abs(shortestDelta(r as number, 0))).toBeLessThan(3)
    })
  })

  it('refuses to show a confident heading when declination is unavailable', async () => {
    // An out-of-range latitude makes magneticDeclination return null: the iOS
    // magnetic reading cannot be corrected, so it must never appear as a
    // valid qibla heading.
    const { container } = render(<QiblaCompass coords={{ lat: 95, lng: 0 }} />)
    for (let i = 0; i < 8; i++) {
      const e = new Event('deviceorientation')
      Object.assign(e, { webkitCompassHeading: 120, webkitCompassAccuracy: 10 })
      window.dispatchEvent(e)
      await new Promise((r) => setTimeout(r, 45))
    }
    await waitFor(() => {
      expect(needleRotationDeg(container)).toBeNull()
      expect(container.querySelector('.q2-status')?.textContent).toContain('لا يمكن حساب اتجاه القبلة')
    })
  })

  it('drops the heading and says so when the phone goes face-down', async () => {
    const { container } = render(<QiblaCompass coords={CAIRO} />)
    await streamPose(0, 0, 0)
    await waitFor(() => expect(needleRotationDeg(container)).not.toBeNull())

    await streamPose(0, 180, 0, 5, 30)
    await waitFor(() => {
      expect(needleRotationDeg(container)).toBeNull()
      expect(container.querySelector('.q2-status')?.textContent).toContain('الهاتف مقلوب')
    })

    // Recovering to a normal pose brings the heading back.
    await streamPose(0, 0, 0)
    await waitFor(() => expect(needleRotationDeg(container)).not.toBeNull())
  })
})
