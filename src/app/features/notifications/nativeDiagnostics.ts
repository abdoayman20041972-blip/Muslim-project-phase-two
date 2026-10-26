// Small persisted record of the last native scheduling run, shown in the
// "فحص الإشعارات" card so a missing notification can be explained instead of
// failing silently. Stored outside the backup key space on purpose.

const KEY = 'muslim_diag_notifications_v1'

export type NotificationDiagnostics = {
  ranAt: string | null
  permission: string
  exactAlarm: string
  scheduled: number
  pending: number | null
  timingsMissingDays: number
  lastError: string | null
  lastErrorAt: string | null
}

const EMPTY: NotificationDiagnostics = {
  ranAt: null,
  permission: 'unknown',
  exactAlarm: 'unknown',
  scheduled: 0,
  pending: null,
  timingsMissingDays: 0,
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
