import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ln = {
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  createChannel: vi.fn(),
  deleteChannel: vi.fn(),
  schedule: vi.fn(),
  cancel: vi.fn(),
  getPending: vi.fn(),
  getDeliveredNotifications: vi.fn(),
}

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: ln }))

const TEST_ID = 700100001

async function load() {
  return import('../../src/app/features/notifications/nativeNotifications')
}

describe('scheduleTestNotification (native)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Every plugin call must resolve: the production code chains .catch() on
    // the results, so a mock returning bare undefined would throw.
    Object.values(ln).forEach((fn) => fn.mockReset().mockResolvedValue(undefined))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    localStorage.clear()
    ln.checkPermissions.mockResolvedValue({ display: 'granted' })
    ln.getPending.mockResolvedValue({ notifications: [] })
    // The fallback check sees the notification as already delivered, so it
    // never posts a second one during these tests.
    ln.getDeliveredNotifications.mockResolvedValue({ notifications: [{ id: TEST_ID }] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses a dedicated high-importance channel and an id no re-scheduling run can cancel', async () => {
    const scheduled: Array<Record<string, unknown>> = []
    ln.schedule.mockImplementation(async ({ notifications }: { notifications: Array<Record<string, unknown>> }) => {
      scheduled.push(...notifications)
    })
    ln.getPending.mockResolvedValue({
      notifications: [{ id: TEST_ID, title: 'إشعار تجريبي', schedule: { at: new Date().toISOString() } }],
    })

    const { scheduleTestNotification } = await load()
    const ok = await scheduleTestNotification()
    expect(ok).toBe(true)

    // A HIGH importance channel means a heads-up banner WITH sound, so the
    // test is visible even while the app is open on screen.
    const channels = ln.createChannel.mock.calls.map((call) => call[0] as Record<string, unknown>)
    expect(channels).toContainEqual(expect.objectContaining({ id: 'muslim-test-v1', importance: 4 }))
    expect(scheduled).toHaveLength(1)
    expect(scheduled[0]!.channelId).toBe('muslim-test-v1')
    expect(scheduled[0]!.id).toBe(TEST_ID)

    // Roughly ten seconds ahead.
    const at = (scheduled[0]!.schedule as { at: Date }).at
    expect(at.getTime()).toBeGreaterThan(Date.now() + 8_000)
    expect(at.getTime()).toBeLessThan(Date.now() + 12_000)

    // The foreground safety net must stay silent while the notification was
    // delivered on time.
    await vi.advanceTimersByTimeAsync(13_000)
    expect(ln.schedule).toHaveBeenCalledTimes(1)
  })

  it('keeps the test id outside the planned window (a re-scheduling run never kills it)', async () => {
    const { isPlannedId } = await load()
    expect(isPlannedId(TEST_ID)).toBe(false)
    expect(isPlannedId(700000000)).toBe(true)
    expect(isPlannedId(700099999)).toBe(true)
    expect(isPlannedId(700100000)).toBe(false)
  })

  it('posts the notification itself when the native alarm has not delivered after 12 seconds', async () => {
    ln.getDeliveredNotifications.mockResolvedValue({ notifications: [] })
    const { scheduleTestNotification } = await load()
    await scheduleTestNotification()
    expect(ln.schedule).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(13_000)
    // The fallback re-armed the same id ~immediately.
    expect(ln.schedule).toHaveBeenCalledTimes(2)
    const fallbackCall = ln.schedule.mock.calls[1]![0] as { notifications: Array<Record<string, unknown>> }
    expect(fallbackCall.notifications[0]!.id).toBe(TEST_ID)
    expect(fallbackCall.notifications[0]!.channelId).toBe('muslim-test-v1')
    const at = (fallbackCall.notifications[0]!.schedule as { at: Date }).at
    expect(at.getTime()).toBeLessThanOrEqual(Date.now() + 1_000)
    // And the diagnostics card can explain what happened.
    const { readDiagnostics } = await import('../../src/app/features/notifications/nativeDiagnostics')
    expect(readDiagnostics().testFallbackUsed).toBe(true)
    expect(readDiagnostics().lastError).toContain('test-notification-fallback')
  })

  it('reports failure when the notification permission is denied', async () => {
    ln.checkPermissions.mockResolvedValue({ display: 'denied' })
    ln.requestPermissions.mockResolvedValue({ display: 'denied' })
    const { scheduleTestNotification } = await load()
    await expect(scheduleTestNotification()).resolves.toBe(false)
    expect(ln.schedule).not.toHaveBeenCalled()
  })
})
