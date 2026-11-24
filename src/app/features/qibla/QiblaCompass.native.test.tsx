import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { QiblaCompass } from './QiblaCompass'

// Simulate the installed APK: Capacitor reports a native platform, so failure
// messages must guide the user on the device, never to browser settings.
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))

const CAIRO = { lat: 30.0444, lng: 31.2357 }
const statusText = (container: HTMLElement) => container.querySelector('.q2-status')?.textContent ?? ''

describe('QiblaCompass installed-app failure messages', () => {
  it('gives device guidance, not Chrome settings, when no sensor events arrive', async () => {
    vi.stubGlobal('DeviceOrientationEvent', class extends Event {})
    const { container } = render(<QiblaCompass coords={CAIRO} />)
    await waitFor(() => expect(statusText(container)).toContain('ابتعد عن المعادن'), { timeout: 4000 })
    expect(statusText(container)).not.toContain('Chrome')
    expect(statusText(container)).not.toContain('المتصفح')
  })

  it('names the device, not the browser, when only relative events arrive', async () => {
    vi.stubGlobal('DeviceOrientationEvent', class extends Event {})
    const { container } = render(<QiblaCompass coords={CAIRO} />)
    window.dispatchEvent(new Event('deviceorientation'))
    await waitFor(() => expect(statusText(container)).toContain('الجهاز لا يوفّر'), { timeout: 4000 })
    expect(statusText(container)).not.toContain('المتصفح')
  })

  it('points to device settings, not browser settings, when motion permission is denied', async () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal(
      'DeviceOrientationEvent',
      class extends Event {
        static requestPermission = async () => 'denied'
      },
    )
    const { container, getByRole } = render(<QiblaCompass coords={CAIRO} />)
    fireEvent.click(getByRole('button', { name: 'تفعيل البوصلة' }))
    await waitFor(() => expect(statusText(container)).toContain('إعدادات الجهاز'))
    expect(statusText(container)).not.toContain('المتصفح')
  })
})
