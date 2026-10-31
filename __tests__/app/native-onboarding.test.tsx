import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

// The first-run onboarding must never touch location: the OS location dialog
// may only appear later, when the user opens a feature that needs it and taps
// «تحديد موقعي». These spies FAIL the test if any Geolocation call happens.
const geo = {
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  getCurrentPosition: vi.fn(),
}

const localNotifications = {
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
}

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@capacitor/geolocation', () => ({ Geolocation: geo }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: localNotifications }))
vi.mock('../../src/app/features/notifications/nativeNotifications', () => ({
  scheduleNativeNotifications: vi.fn().mockResolvedValue(undefined),
  checkExactAlarm: vi.fn().mockResolvedValue('granted'),
  openExactAlarmSettings: vi.fn().mockResolvedValue('granted'),
}))

const ONBOARDING_DONE_KEY = 'azkar_native_onboarding_v1'

async function renderOnboarding() {
  const { NativeOnboarding } = await import('../../src/app/features/permissions/NativeOnboarding')
  return render(<NativeOnboarding />)
}

describe('NativeOnboarding (first run, native)', () => {
  beforeEach(() => {
    Object.values(geo).forEach((fn) => fn.mockReset())
    localNotifications.checkPermissions.mockReset()
    localNotifications.requestPermissions.mockReset()
    localNotifications.checkPermissions.mockResolvedValue({ display: 'prompt' })
    localNotifications.requestPermissions.mockResolvedValue({ display: 'granted' })
    localStorage.removeItem(ONBOARDING_DONE_KEY)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows the first-run dialog but never asks for location', async () => {
    await renderOnboarding()
    expect(await screen.findByRole('dialog', { name: 'إعداد التطبيق' })).toBeInTheDocument()
    // Nothing at first launch may trigger a location request — not even a
    // permission CHECK (the request itself is contextual, from prayer times
    // or settings, via acquireLocation()).
    expect(geo.checkPermissions).not.toHaveBeenCalled()
    expect(geo.requestPermissions).not.toHaveBeenCalled()
    expect(geo.getCurrentPosition).not.toHaveBeenCalled()
    // The location expectation note is shown instead of a request card.
    expect(screen.getByText(/لن يُطلب الآن/)).toBeInTheDocument()
  })

  it('asks only for notifications and marks the flow done once answered', async () => {
    await renderOnboarding()
    fireEvent.click(await screen.findByRole('button', { name: 'السماح' }))
    await waitFor(() => expect(localNotifications.requestPermissions).toHaveBeenCalledTimes(1))
    expect(geo.requestPermissions).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'ابدأ الاستخدام' }))
    expect(localStorage.getItem(ONBOARDING_DONE_KEY)).toBe('1')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not appear again once the flow was completed', async () => {
    localStorage.setItem(ONBOARDING_DONE_KEY, '1')
    const { container } = await renderOnboarding()
    expect(container).toBeEmptyDOMElement()
    expect(geo.checkPermissions).not.toHaveBeenCalled()
  })
})
