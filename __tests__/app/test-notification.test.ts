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
  checkExactNotificationSetting: vi.fn(),
  changeExactNotificationSetting: vi.fn(),
}

// The custom plugin that arms alarms with setAlarmClock: timing goes through
// HERE, while channels/permission/tap actions stay on @capacitor/local-notifications.
const alarms = {
  schedule: vi.fn(),
  add: vi.fn(),
  cancelOne: vi.fn(),
  cancel: vi.fn(),
  pending: vi.fn(),
  check: vi.fn(),
}

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: ln }))
vi.mock('@muslim/exact-alarms', () => ({ ExactAlarms: alarms }))

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
    Object.values(alarms).forEach((fn) => fn.mockReset().mockResolvedValue(undefined))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    localStorage.clear()
    ln.checkPermissions.mockResolvedValue({ display: 'granted' })
    ln.getPending.mockResolvedValue({ notifications: [] })
    alarms.add.mockResolvedValue({ armed: 1, stored: 1 })
    // The fallback check sees the notification as already delivered, so it
    // never posts a second one during these tests.
    ln.getDeliveredNotifications.mockResolvedValue({ notifications: [{ id: TEST_ID }] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('arms the test alarm through setAlarmClock with a dedicated high-importance channel', async () => {
    const { scheduleTestNotification } = await load()
    const ok = await scheduleTestNotification()
    expect(ok).toBe(true)

    // The arm call went through the exact-alarms plugin, NOT the stock one.
    expect(alarms.add).toHaveBeenCalledTimes(1)
    expect(ln.schedule).not.toHaveBeenCalled()
    const alarm = alarms.add.mock.calls[0]![0].alarm as Record<string, unknown>
    expect(alarm.id).toBe(TEST_ID)
    expect(alarm.channel).toBe('muslim-test-v1')

    // Roughly ten seconds ahead.
    const at = alarm.at as number
    expect(at).toBeGreaterThan(Date.now() + 8_000)
    expect(at).toBeLessThan(Date.now() + 12_000)

    // A HIGH importance channel means a heads-up banner WITH sound, so the
    // test is visible even while the app is open on screen.
    const channels = ln.createChannel.mock.calls.map((call) => call[0] as Record<string, unknown>)
    expect(channels).toContainEqual(expect.objectContaining({ id: 'muslim-test-v1', importance: 4 }))

    // The foreground safety net must stay silent while the notification was
    // delivered on time.
    await vi.advanceTimersByTimeAsync(13_000)
    expect(ln.schedule).not.toHaveBeenCalled()
  })

  it('replaces a previous pending test instead of stacking a second one', async () => {
    const { scheduleTestNotification } = await load()
    await scheduleTestNotification()
    await scheduleTestNotification()
    // The stale test alarm is cancelled by id — the 30-day plan is untouched
    // (cancel/cancelOne with the whole plan never happens here).
    expect(alarms.cancelOne).toHaveBeenCalledWith({ id: TEST_ID })
    expect(alarms.cancel).not.toHaveBeenCalled()
    expect(alarms.add).toHaveBeenCalledTimes(2)
  })

  it('keeps the test id outside the planned window (a re-scheduling run never kills it)', async () => {
    const { isPlannedId } = await load()
    expect(isPlannedId(TEST_ID)).toBe(false)
    expect(isPlannedId(700000000)).toBe(true)
    expect(isPlannedId(700099999)).toBe(true)
    expect(isPlannedId(700100000)).toBe(false)
  })

  it('posts the notification itself when the setAlarmClock alarm has not delivered after 12 seconds', async () => {
    ln.getDeliveredNotifications.mockResolvedValue({ notifications: [] })
    const { scheduleTestNotification } = await load()
    await scheduleTestNotification()
    expect(ln.schedule).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(13_000)
    // The fallback re-armed the same id ~immediately through the stock plugin.
    expect(ln.schedule).toHaveBeenCalledTimes(1)
    const fallbackCall = ln.schedule.mock.calls[0]![0] as { notifications: Array<Record<string, unknown>> }
    expect(fallbackCall.notifications[0]!.id).toBe(TEST_ID)
    expect(fallbackCall.notifications[0]!.channelId).toBe('muslim-test-v1')
    const at = (fallbackCall.notifications[0]!.schedule as { at: Date }).at
    expect(at.getTime()).toBeLessThanOrEqual(Date.now() + 1_000)
    // And the stale exact alarm was cancelled by id first, not the whole plan.
    expect(alarms.cancelOne).toHaveBeenCalledWith({ id: TEST_ID })
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
    expect(alarms.add).not.toHaveBeenCalled()
  })
})
