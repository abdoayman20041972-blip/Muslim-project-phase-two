import { beforeEach, describe, expect, it } from 'vitest'
import { timeLabel, withTimeInBody, DAYS_AHEAD } from '../../src/app/features/notifications/nativeNotifications'
import { APP_SETTINGS_KEYS } from '../../src/app/settings'
import type { PlannedNotification } from '../../src/app/features/notifications/notificationPlan'

// The notification body carries the intended prayer time, so a notification
// that a battery saver delivers late is self-explanatory instead of confusing.

beforeEach(() => {
  localStorage.clear()
})

describe('timeLabel', () => {
  it('formats 24-hour times with Arabic digits by default', () => {
    expect(timeLabel(new Date(2026, 9, 26, 4, 52))).toBe('٠٤:٥٢')
    expect(timeLabel(new Date(2026, 9, 26, 16, 5))).toBe('١٦:٠٥')
  })

  it('follows the 12-hour setting with ص/م suffixes', () => {
    localStorage.setItem(APP_SETTINGS_KEYS.timeFormat, '12')
    expect(timeLabel(new Date(2026, 9, 26, 4, 52))).toBe('٠٤:٥٢ ص')
    expect(timeLabel(new Date(2026, 9, 26, 16, 5))).toBe('٠٤:٠٥ م')
    expect(timeLabel(new Date(2026, 9, 26, 12, 0))).toBe('١٢:٠٠ م')
  })

  it('respects the western digit style', () => {
    localStorage.setItem(APP_SETTINGS_KEYS.numberStyle, 'western')
    expect(timeLabel(new Date(2026, 9, 26, 4, 52))).toBe('04:52')
  })
})

describe('withTimeInBody', () => {
  const adhan: PlannedNotification = {
    id: 1,
    title: 'حان وقت صلاة الفجر',
    body: 'حي على الصلاة، حي على الفلاح',
    channel: 'muslim-adhan-v2-adhan',
    target: 'prayer',
    at: new Date(2026, 9, 26, 4, 52),
    group: 'muslim-prayer-times',
  }
  const before: PlannedNotification = {
    id: 2,
    title: 'اقترب وقت صلاة الفجر',
    body: 'تبقى 5 دقائق على الأذان',
    channel: 'muslim-prayer-v2',
    target: 'prayer',
    at: new Date(2026, 9, 26, 4, 47),
    group: 'muslim-prayer-times',
  }
  const azkar: PlannedNotification = {
    id: 3,
    title: 'أذكار الصباح',
    body: 'حان وقت أذكار الصباح مع الشروق.',
    channel: 'muslim-reminders-v2',
    target: 'azkar',
    at: new Date(2026, 9, 26, 6, 10),
  }
  const daily: PlannedNotification = {
    id: 4,
    title: 'حان وقت قراءة القرآن',
    body: 'خصص وقتك اليوم لتلاوة القرآن.',
    channel: 'muslim-reminders-v2',
    target: 'ayah',
    daily: { hour: 20, minute: 0 },
  }

  it('appends the adhan time to prayer notifications', () => {
    const [out] = withTimeInBody([adhan])
    expect(out.body).toBe('حي على الصلاة، حي على الفلاح · موعد الأذان ٠٤:٥٢')
  })

  it('keeps the lead text and adds the adhan time for pre-prayer reminders', () => {
    const [out] = withTimeInBody([before])
    expect(out.body).toBe('تبقى 5 دقائق على الأذان — موعد الأذان ٠٤:٤٧')
  })

  it('adds the time in parentheses to non-prayer notifications', () => {
    const [out] = withTimeInBody([azkar])
    expect(out.body).toBe('حان وقت أذكار الصباح مع الشروق. (٠٦:١٠)')
  })

  it('leaves repeating notifications without a date untouched', () => {
    const [out] = withTimeInBody([daily])
    expect(out.body).toBe('خصص وقتك اليوم لتلاوة القرآن.')
  })

  it('does not duplicate the label when the body already contains it', () => {
    const already: PlannedNotification = { ...azkar, body: 'حان وقت أذكار الصباح مع الشروق. (٠٦:١٠)' }
    const [out] = withTimeInBody([already])
    expect(out.body).toBe('حان وقت أذكار الصباح مع الشروق. (٠٦:١٠)')
  })
})

describe('DAYS_AHEAD', () => {
  it('schedules a month of alarms so notifications survive weeks without opening the app', () => {
    expect(DAYS_AHEAD).toBeGreaterThanOrEqual(30)
  })
})
