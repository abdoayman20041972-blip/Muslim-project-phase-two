// Web stub: alarm scheduling is an Android-only feature. Every method resolves
// with an empty/unchanged result so the shared scheduling code can call it
// unconditionally.
export const ExactAlarmsWeb = {
  async schedule() {
    return { armed: 0, stored: 0 }
  },
  async add() {
    return { armed: 0, stored: 0 }
  },
  async cancelOne() {
    return undefined
  },
  async cancel() {
    return undefined
  },
  async pending() {
    return { items: [] }
  },
  async check() {
    return { exactAlarm: 'unknown' }
  },
  async launchNotification() {
    return { notification: null }
  },
  async fireLog() {
    return { items: [] }
  },
  async clearFireLog() {
    return undefined
  },
  async status() {
    return { ignoringBatteryOptimizations: false, notificationsEnabled: true, needsReplan: false, storedAlarms: 0 }
  },
}
