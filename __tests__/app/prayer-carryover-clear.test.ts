import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ native: false, schedule: vi.fn() }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => state.native, getPlatform: () => (state.native ? 'android' : 'web') } }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }))
vi.mock('@muslim/exact-alarms', () => ({ ExactAlarms: { schedule: state.schedule, pending: vi.fn(), cancelOne: vi.fn() } }))

import { dropPrayerPlanCarryover } from '../../src/app/features/notifications/nativeNotifications'
import { TEST_NOTIFICATION_ID } from '../../src/app/features/notifications/notificationPlan'

describe('dropPrayerPlanCarryover', () => {
  beforeEach(() => {
    localStorage.clear()
    state.schedule.mockReset()
    state.native = false
  })
  it('on web only clears the cached prayer plan', async () => {
    localStorage.setItem('azkar_prayer_plan_cache_v1', '[]')
    expect(await dropPrayerPlanCarryover()).toBe(true)
    expect(localStorage.getItem('azkar_prayer_plan_cache_v1')).toBeNull()
    expect(state.schedule).not.toHaveBeenCalled()
  })
  it('on Android replaces the native plan with an empty one that keeps only the test alarm', async () => {
    state.native = true
    state.schedule.mockResolvedValue({ armed: 0, stored: 0 })
    localStorage.setItem('azkar_prayer_plan_cache_v1', '[]')
    expect(await dropPrayerPlanCarryover()).toBe(true)
    expect(localStorage.getItem('azkar_prayer_plan_cache_v1')).toBeNull()
    expect(state.schedule).toHaveBeenCalledWith(expect.objectContaining({ alarms: [], keepIds: [TEST_NOTIFICATION_ID] }))
  })
  it('reports failure when the native replace throws, so callers do not reload', async () => {
    state.native = true
    state.schedule.mockRejectedValue(new Error('boom'))
    expect(await dropPrayerPlanCarryover()).toBe(false)
  })
})
