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
