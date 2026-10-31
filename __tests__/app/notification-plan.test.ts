import { describe, expect, it } from 'vitest'
import { ID_BASE, ID_RANGE, KIND, makeId, planNotifications, TEST_NOTIFICATION_ID, type PlanInput } from '../../src/app/features/notifications/notificationPlan'

const timings = { Fajr: '04:50', Sunrise: '06:10', Dhuhr: '11:40', Asr: '14:50', Maghrib: '17:20', Isha: '18:40', Sunset: '17:19' }
const start = new Date(2026, 9, 26)
const days = Array.from({ length: 7 }, (_, i) => new Date(2026, 9, 26 + i))
const noon = new Date(2026, 9, 26, 12, 0).getTime()
const channels = { adhan: 'adhan', prayer: 'prayer', reminder: 'reminder' }

const base: PlanInput = {
  now: noon,
  days,
  timingsByDay: days.map(() => ({ ...timings })),
  atTimeEnabled: false,
  beforeEnabled: false,
  ayahEnabled: false,
  ayahTime: '09:00',
  quranEnabled: false,
  quranTime: '20:00',
  morningEnabled: false,
  eveningEnabled: false,
  lead: 5,
  channels,
}

const kindOf = (id: number) => Math.floor((id - ID_BASE) / 1000)

describe('planNotifications', () => {
  it('plans nothing when everything is off', () => {
    expect(planNotifications(base)).toEqual([])
  })

  it('drops times that already passed today and keeps all five prayers on later days', () => {
    const plan = planNotifications({ ...base, atTimeEnabled: true })
    // Dhuhr (11:40) is before the 12:00 clock, so day 0 keeps Asr, Maghrib and Isha only.
    expect(plan.filter((n) => n.id < makeId(KIND.at, 1, 0))).toHaveLength(3)
    expect(plan).toHaveLength(3 + 6 * 5)
    expect(plan.every((n) => n.channel === 'adhan' && n.target === 'prayer')).toBe(true)
  })

  it('schedules the pre-prayer reminder lead minutes earlier', () => {
    const plan = planNotifications({ ...base, beforeEnabled: true, lead: 10 })
    const asr = plan.find((n) => n.id === makeId(KIND.before, 0, 2))!
    expect(asr.at!.getHours()).toBe(14)
    expect(asr.at!.getMinutes()).toBe(40)
    expect(asr.channel).toBe('prayer')
  })

  it('uses unique deterministic ids inside the reserved range', () => {
    const plan = planNotifications({
      ...base,
      atTimeEnabled: true,
      beforeEnabled: true,
      ayahEnabled: true,
      quranEnabled: true,
      morningEnabled: true,
      eveningEnabled: true,
    })
    const ids = plan.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id >= ID_BASE && id < ID_BASE + 100_000)).toBe(true)
    expect(planNotifications({ ...base, atTimeEnabled: true }).map((n) => n.id)).toEqual(
      planNotifications({ ...base, atTimeEnabled: true }).map((n) => n.id),
    )
  })

  it('puts the daily ayah at the chosen time, one entry per remaining date', () => {
    const plan = planNotifications({ ...base, ayahEnabled: true, ayahTime: '07:30' })
    // 07:30 already passed on day 0, so six dates remain.
    expect(plan).toHaveLength(6)
    expect(plan.every((n) => n.at!.getHours() === 7 && n.at!.getMinutes() === 30 && kindOf(n.id) === KIND.ayah)).toBe(true)
  })

  it('falls back to 09:00 when the ayah time is malformed', () => {
    const plan = planNotifications({ ...base, ayahEnabled: true, ayahTime: 'later' })
    expect(plan[0].at!.getHours()).toBe(9)
    expect(plan[0].at!.getMinutes()).toBe(0)
  })

  it('makes the Quran reminder one dated entry per coming date', () => {
    const plan = planNotifications({ ...base, quranEnabled: true, quranTime: '21:15' })
    // 21:15 is later than the 12:00 clock even on day 0, so every date counts.
    expect(plan).toHaveLength(7)
    expect(plan.every((n) => n.at!.getHours() === 21 && n.at!.getMinutes() === 15 && kindOf(n.id) === KIND.quran)).toBe(true)
    const ids = plan.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('skips a day whose timings are missing but keeps the other days', () => {
    const timingsByDay = days.map((_, i) => (i === 2 ? null : { ...timings }))
    const plan = planNotifications({ ...base, timingsByDay, atTimeEnabled: true, ayahEnabled: true })
    expect(plan.some((n) => n.id >= makeId(KIND.at, 2, 0) && n.id <= makeId(KIND.at, 2, 4))).toBe(false)
    expect(plan.some((n) => n.id === makeId(KIND.ayah, 2, 0))).toBe(true)
  })

  it('uses Maghrib for the evening azkar when Sunset is not provided', () => {
    const { Sunset: _unused, ...withoutSunset } = timings
    const plan = planNotifications({ ...base, eveningEnabled: true, timingsByDay: days.map(() => ({ ...withoutSunset })) })
    const first = plan.find((n) => n.id === makeId(KIND.evening, 0, 0))!
    expect(first.at!.getHours()).toBe(17)
    expect(first.at!.getMinutes()).toBe(20)
  })

  it('plans the morning azkar at sunrise', () => {
    const plan = planNotifications({ ...base, morningEnabled: true })
    // Sunrise 06:10 already passed on day 0.
    expect(plan).toHaveLength(6)
    expect(plan.every((n) => n.at!.getHours() === 6 && n.at!.getMinutes() === 10)).toBe(true)
    expect(start.getDate()).toBe(26)
  })

  it('keeps the diagnostic test notification outside the cancelable window', () => {
    // Every re-scheduling run cancels [ID_BASE, ID_BASE + ID_RANGE); the test
    // notification must survive it or a resume/settings change inside the 10
    // seconds silently kills the pending test.
    expect(TEST_NOTIFICATION_ID).toBeGreaterThanOrEqual(ID_BASE + ID_RANGE)
    expect(TEST_NOTIFICATION_ID).toBeLessThan(2 ** 31 - 1)
  })
})
