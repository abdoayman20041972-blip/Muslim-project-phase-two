import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { QiblaCompass, dialLabelAngle, qiblaBearing } from './QiblaCompass'
import { APP_SETTINGS_KEYS } from '../../settings'

// Stage 3 (audit plan items 5-8): cardinal ring + numeric readout, alignment
// announcement/haptics, calibration guidance, Android jitter alert.
const CAIRO = { lat: 30.0444, lng: 31.2357 }
const BEARING = qiblaBearing(CAIRO.lat, CAIRO.lng) // ~136.1

function orientationEvent(alpha: number, beta: number, gamma: number): Event {
  const e = new Event('deviceorientationabsolute')
  Object.assign(e, { alpha, beta, gamma, absolute: true })
  return e
}

async function stream(alphas: number[], gapMs = 30) {
  for (const alpha of alphas) {
    window.dispatchEvent(orientationEvent(alpha, 0, 0))
    await new Promise((r) => setTimeout(r, gapMs))
  }
}

const steady = (alpha: number, events = 10) => Array.from({ length: events }, () => alpha)

function cardinalRotation(container: HTMLElement, label: string): number | null {
  const text = Array.from(container.querySelectorAll('.q2-cardinal')).find((el) => el.textContent === label)
  const g = text?.closest('g')
  const m = g ? /rotate\((-?[\d.]+) 120 120\)/.exec(g.getAttribute('transform') ?? '') : null
  return m ? Number(m[1]) : null
}

const statusText = (container: HTMLElement) => container.querySelector('.q2-status')?.textContent ?? ''

describe('QiblaCompass stage 3: cardinal ring and numeric readout', () => {
  beforeEach(() => {
    vi.stubGlobal('DeviceOrientationEvent', class extends Event {})
    localStorage.clear()
  })

  it('shows the four full Arabic direction names at their static angles before any reading', () => {
    const { container } = render(<QiblaCompass coords={CAIRO} />)
    expect(cardinalRotation(container, 'شمال')).toBe(0)
    expect(cardinalRotation(container, 'شرق')).toBe(90)
    expect(cardinalRotation(container, 'جنوب')).toBe(180)
    expect(cardinalRotation(container, 'غرب')).toBe(270)
  })

  it('rotates the cardinal ring with the phone heading via dialLabelAngle', async () => {
    const { container } = render(<QiblaCompass coords={CAIRO} />)
    // Flat pose, alpha 270 -> facing east (heading ~90): north label moves to -90.
    await stream(steady(270))
    await waitFor(() => {
      const a = cardinalRotation(container, 'شمال')
      expect(a).not.toBeNull()
      expect(Math.abs((a as number) - dialLabelAngle(0, 90))).toBeLessThan(3)
      expect(Math.abs((cardinalRotation(container, 'شرق') as number) - dialLabelAngle(90, 90))).toBeLessThan(3)
    })
  })

  it('shows the numeric qibla angle and the live heading', async () => {
    const { container } = render(<QiblaCompass coords={CAIRO} />)
    const line = () => container.querySelector('.q2-bearing')?.textContent ?? ''
    expect(line()).toContain('زاوية القبلة 136° من الشمال')
    await stream(steady(270))
    await waitFor(() => expect(line()).toContain('اتجاهك 90°'))
  })

  it('describes the dial to screen readers with live degrees', async () => {
    const { container } = render(<QiblaCompass coords={CAIRO} />)
    const dial = container.querySelector('.q2-dial') as HTMLElement
    expect(dial.getAttribute('aria-label')).toBe('بوصلة القبلة')
    await stream(steady(270))
    await waitFor(() => expect(dial.getAttribute('aria-label')).toContain('اتجاهك الحالي 90 درجة من الشمال'))
    expect(dial.getAttribute('aria-label')).toContain('زاوية القبلة 136 درجة')
  })
})

describe('QiblaCompass stage 3: alignment announcement and haptics', () => {
  beforeEach(() => {
    vi.stubGlobal('DeviceOrientationEvent', class extends Event {})
    localStorage.clear()
  })

  function vibrateSpy() {
    const spy = vi.fn()
    Object.defineProperty(window.navigator, 'vibrate', { value: spy, configurable: true })
    return spy
  }

  it('announces alignment once and vibrates when the vibration setting is on', async () => {
    const spy = vibrateSpy()
    const { container } = render(<QiblaCompass coords={CAIRO} />)
    // Face the qibla: flat pose, alpha = 360 - bearing.
    await stream(steady(360 - BEARING), 14)
    const region = () => container.querySelector('[role="status"]')?.textContent ?? ''
    await waitFor(() => expect(region()).toBe('أنت الآن باتجاه القبلة'))
    // Deliberately screen-reader-only: the needle and gold dial already show
    // alignment visually; the live region exists so screen readers announce it.
    expect(container.querySelector('[role="status"]')?.classList.contains('q2-sr-only')).toBe(true)
    expect(spy).toHaveBeenCalledWith([10, 18, 10])
    expect(spy).toHaveBeenCalledTimes(1)

    // Leaving the qibla clears the announcement without another vibration.
    await stream(steady(360 - BEARING - 60))
    await waitFor(() => expect(region()).toBe(''))
    expect(spy).toHaveBeenCalledTimes(1)

    // Re-entering announces and vibrates again. The smoothing filter needs
    // real time to swing back from 60° away, so stream a longer dwell.
    await stream(steady(360 - BEARING, 25), 45)
    await waitFor(() => expect(region()).toBe('أنت الآن باتجاه القبلة'))
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('does not vibrate when the vibration setting is off, but still announces', async () => {
    const spy = vibrateSpy()
    localStorage.setItem(APP_SETTINGS_KEYS.vibration, '0')
    const { container } = render(<QiblaCompass coords={CAIRO} />)
    await stream(steady(360 - BEARING), 14)
    await waitFor(() => expect(container.querySelector('[role="status"]')?.textContent).toBe('أنت الآن باتجاه القبلة'))
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('QiblaCompass stage 3: calibration guidance and jitter alert', () => {
  beforeEach(() => {
    vi.stubGlobal('DeviceOrientationEvent', class extends Event {})
    localStorage.clear()
  })

  it('shows figure-eight guidance after tapping معايرة', async () => {
    const { container, getByRole } = render(<QiblaCompass coords={CAIRO} />)
    await stream(steady(10))
    await waitFor(() => expect(container.querySelector('.q2-needle-layer.is-on')).not.toBeNull())
    fireEvent.click(getByRole('button', { name: 'معايرة البوصلة' }))
    await stream(steady(10), 6)
    await waitFor(() => expect(statusText(container)).toContain('الرقم 8'))
  })

  it('warns on a wildly oscillating stream but not on a smooth deliberate turn', async () => {
    const { container } = render(<QiblaCompass coords={CAIRO} />)
    // Oscillating ±12° every sample: jitter residual ~12 > threshold.
    const noisy = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 88 : 112))
    await stream(noisy)
    await waitFor(() => expect(statusText(container)).toContain('غير مستقرة'))

    // A smooth 4°/step turn must not be flagged.
    const { container: c2 } = render(<QiblaCompass coords={CAIRO} />)
    const turn = Array.from({ length: 20 }, (_, i) => (300 + i * 4) % 360)
    await stream(turn)
    await new Promise((r) => setTimeout(r, 60))
    expect(statusText(c2)).not.toContain('غير مستقرة')
  })
})
