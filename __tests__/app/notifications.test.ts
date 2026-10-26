import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getNotificationPermission, requestNotificationPermission, showAppNotification } from '../../src/app/features/notifications/notifications'

describe('notification provider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('reports unsupported when Notification is unavailable', () => {
    vi.stubGlobal('Notification', undefined)
    expect(getNotificationPermission()).toBe('unsupported')
  })

  it('requests permission through the browser API', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted')
    vi.stubGlobal('Notification', { permission: 'default', requestPermission })
    await expect(requestNotificationPermission()).resolves.toBe('granted')
    expect(requestPermission).toHaveBeenCalledOnce()
  })

  it('uses a service worker notification when available', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('Notification', { permission: 'granted' })
    vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve({ showNotification }) } })
    await expect(showAppNotification('العنوان', 'النص', 'tag-1')).resolves.toBe(true)
    expect(showNotification).toHaveBeenCalledWith('العنوان', expect.objectContaining({ body: 'النص', tag: 'tag-1', dir: 'rtl', lang: 'ar' }))
  })

  it('falls back to Notification when service worker delivery fails', async () => {
    const NotificationMock = vi.fn()
    Object.assign(NotificationMock, { permission: 'granted' })
    vi.stubGlobal('Notification', NotificationMock)
    vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.reject(new Error('no-sw')) } })
    await expect(showAppNotification('العنوان', 'النص')).resolves.toBe(true)
    expect(NotificationMock).toHaveBeenCalledWith('العنوان', expect.objectContaining({ body: 'النص' }))
  })
})
