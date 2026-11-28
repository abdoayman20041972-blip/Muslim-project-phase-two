import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { QiblaCompass } from './QiblaCompass'

beforeEach(() => {
  // jsdom has no DeviceOrientationEvent; the compass only starts listening when it exists.
  Object.defineProperty(window, 'DeviceOrientationEvent', { value: class {}, configurable: true })
})
afterEach(() => {
  cleanup()
  Reflect.deleteProperty(window, 'DeviceOrientationEvent')
})

const coords = { lat: 30.0444, lng: 31.2357 }

describe('compass diagnostics panel', () => {
  it('is closed by default and shows event facts when opened', () => {
    render(<QiblaCompass coords={coords} />)
    expect(screen.queryByText('alpha الخام')).toBeNull()
    const ev = new Event('deviceorientationabsolute') as Event & Record<string, unknown>
    Object.assign(ev, { alpha: 90, beta: 0, gamma: 0, absolute: true })
    act(() => {
      window.dispatchEvent(ev)
    })
    fireEvent.click(screen.getByText('تشخيص البوصلة'))
    expect(screen.getByText('alpha الخام')).toBeTruthy()
    expect(screen.getByText('deviceorientationabsolute', { selector: 'dd' })).toBeTruthy()
    expect(screen.getByText('90.0')).toBeTruthy()
    expect(screen.getByText('الانحراف المغناطيسي المحسوب')).toBeTruthy()
  })
  it('does not change the heading: same bearing text with the panel open or closed', () => {
    render(<QiblaCompass coords={coords} />)
    const before = document.querySelector('.q2-bearing')!.textContent
    fireEvent.click(screen.getByText('تشخيص البوصلة'))
    expect(document.querySelector('.q2-bearing')!.textContent).toBe(before)
  })
})
