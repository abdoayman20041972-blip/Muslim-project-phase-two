export interface ExactAlarm {
  /** Stable notification id (same id space the app already uses). */
  id: number
  /** Epoch milliseconds the alarm must fire at — the exact prayer/reminder time. */
  at: number
  title: string
  body: string
  /** NotificationChannel id created via @capacitor/local-notifications (carries the adhan sound). */
  channel: string
  /** Deep-link target: 'prayer' | 'azkar' | 'ayah' */
  target: string
  /** Optional Android notification group. */
  group?: string | null
}

export interface ExactAlarmsPlugin {
  /** Replaces the whole alarm plan: cancels everything previously armed by this plugin except `keepIds`, then arms every future entry with setAlarmClock(). */
  schedule(options: { alarms: ExactAlarm[]; keepIds?: number[] }): Promise<{ armed: number; stored: number }>
  /** Arms ONE alarm on top of the stored plan (used by the diagnostic test). */
  add(options: { alarm: ExactAlarm }): Promise<{ armed: number; stored: number }>
  /** Cancels ONE alarm by id without touching the rest of the plan. */
  cancelOne(options: { id: number }): Promise<void>
  /** Cancels every alarm armed by this plugin and clears its storage. */
  cancel(): Promise<void>
  /** Alarms currently stored (armed) by the plugin, for the diagnostics card. */
  pending(): Promise<{ items: Array<{ id: number; at: number; title: string }> }>
  /** Exact-alarm special access state: 'granted' | 'denied'. */
  check(): Promise<{ exactAlarm: string }>
}

export declare const ExactAlarms: ExactAlarmsPlugin
