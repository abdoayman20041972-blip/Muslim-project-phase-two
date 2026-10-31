// Small persisted record of the last native scheduling run, shown in the
// "فحص الإشعارات" card so a missing notification can be explained instead of
// failing silently. Stored outside the backup key space on purpose.

const KEY = 'muslim_diag_notifications_v1'

export type NotificationDiagnostics = {
  ranAt: string | null
  permission: string
  exactAlarm: string
  scheduled: number
  /** How many alarms the OS actually ARMED in the last run (the 48h window). */
  armed: number | null
  /** The armed window length in ms, shown so "armed" reads correctly. */
  armWindowMs: number | null
  /** How many entries the native side has stored (the full 30-day plan). */
  pending: number | null
  timingsMissingDays: number
  /** Prayer-based notifications are enabled but no location is saved. */
  locationMissing: boolean
  /** When the 10-second test notification was last scheduled. */
  testScheduledAt: string | null
  /** True when the native alarm had not delivered it and the JS fallback posted it. */
  testFallbackUsed: boolean
  lastError: string | null
  lastErrorAt: string | null
}

const EMPTY: NotificationDiagnostics = {
  ranAt: null,
  permission: 'unknown',
  exactAlarm: 'unknown',
  scheduled: 0,
  armed: null,
  armWindowMs: null,
  pending: null,
  timingsMissingDays: 0,
  locationMissing: false,
  testScheduledAt: null,
  testFallbackUsed: false,
  lastError: null,
  lastErrorAt: null,
}

export function readDiagnostics(): NotificationDiagnostics {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<NotificationDiagnostics>) } : { ...EMPTY }
  } catch (error) {
    console.error('[notifications] could not read diagnostics', error)
    return { ...EMPTY }
  }
}

export function patchDiagnostics(patch: Partial<NotificationDiagnostics>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readDiagnostics(), ...patch }))
  } catch (error) {
    console.error('[notifications] could not write diagnostics', error)
  }
  window.dispatchEvent(new Event('muslim-notification-diagnostics'))
}

export function recordError(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[notifications] ${scope}`, error)
  patchDiagnostics({ lastError: `${scope}: ${message}`, lastErrorAt: new Date().toISOString() })
}
