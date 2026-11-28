import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QiblaCompass } from './QiblaCompass'
import { QiblaView } from './QiblaView'

afterEach(cleanup)

describe('qibla front-end items', () => {
  it('shows the direction name and the distance to Makkah for Cairo', () => {
    render(<QiblaCompass coords={{ lat: 30.04, lng: 31.24 }} />)
    expect(document.querySelector('.q2-bearing')!.textContent).toContain('جنوب شرق')
    expect(screen.getByTestId('q2-distance').textContent).toContain('كم')
  })
  it('shows the location in use with a change link that opens the location screen', () => {
    localStorage.setItem('azkar_coords', JSON.stringify({ lat: 30.04, lng: 31.24 }))
    const open = vi.fn()
    render(<QiblaView onBack={() => {}} onOpenLocation={open} />)
    expect(screen.getByTestId('q2-location').textContent).toContain('30.04')
    fireEvent.click(screen.getByText('تغيير'))
    expect(open).toHaveBeenCalledTimes(1)
    localStorage.clear()
  })
  it('asks for a screen wake lock while open and releases it on leaving', async () => {
    const release = vi.fn(async () => {})
    const request = vi.fn(async () => ({ release }))
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
    const { unmount } = render(<QiblaCompass coords={{ lat: 30.04, lng: 31.24 }} />)
    await Promise.resolve()
    await Promise.resolve()
    expect(request).toHaveBeenCalledWith('screen')
    unmount()
    expect(release).toHaveBeenCalled()
    Reflect.deleteProperty(navigator, 'wakeLock')
  })
  it('releases a web wake lock that resolves after the screen was left', async () => {
    const release = vi.fn(async () => {})
    let resolve: (v: { release: typeof release }) => void = () => {}
    const request = vi.fn(() => new Promise<{ release: typeof release }>((r) => { resolve = r }))
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
    const { unmount } = render(<QiblaCompass coords={{ lat: 30.04, lng: 31.24 }} />)
    unmount()
    resolve({ release })
    await Promise.resolve()
    await Promise.resolve()
    expect(release).toHaveBeenCalled()
    Reflect.deleteProperty(navigator, 'wakeLock')
  })
})
