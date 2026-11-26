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
  /**
   * Milliseconds after POSTING before Android removes the notification from
   * the shade by itself (setTimeoutAfter). 0 or absent = never auto-remove.
   */
  ttl?: number
  /** Fixed local clock time: native code keeps the local hour if the device time zone changes. Default false. */
  wallClock?: boolean
}

export interface LaunchNotification {
  id: number
  title: string
  body: string
  extra: { target: string }
}

export interface ExactAlarmsPlugin {
  /**
   * Replaces the whole alarm plan: cancels every previously armed alarm whose
   * id is not in the new plan (or `keepIds`), STORES the full plan, but ARMS
   * with setAlarmClock() only the entries inside the `armWithinMs` window —
   * the fire receiver chain-advances the window as alarms fire.
   */
  schedule(options: { alarms: ExactAlarm[]; keepIds?: number[]; armWithinMs?: number }): Promise<{ armed: number; stored: number }>
  /** Arms ONE alarm on top of the stored plan (used by the diagnostic test). */
  add(options: { alarm: ExactAlarm }): Promise<{ armed: number; stored: number }>
  /** Cancels ONE alarm by id without touching the rest of the plan. */
  cancelOne(options: { id: number }): Promise<void>
  /** Cancels every alarm armed by this plugin and clears its storage. */
  cancel(): Promise<void>
  /** Future alarms still stored by the plugin (the full plan), for the diagnostics card. */
  pending(): Promise<{ items: Array<{ id: number; at: number; title: string }> }>
  /** Exact-alarm special access state: 'granted' | 'denied'. */
  check(): Promise<{ exactAlarm: string }>
  /**
   * Cold-start notification tap: reads the tap extras the fire receiver put on
   * the launch intent (the stock plugin only handles WARM starts in
   * handleOnNewIntent, so without this a tap on a killed app opened Home).
   * Returns { notification: null } once consumed or when the app was not
   * launched from a notification.
   */
  launchNotification(): Promise<{ notification: LaunchNotification | null }>
  /** What the native receivers did: fired alarms and clock/boot events, oldest first (newest 40). */
  fireLog(): Promise<{ items: FireLogItem[] }>
  clearFireLog(): Promise<void>
  /** Native-only facts: battery optimization exemption, notifications enabled, plan needing a rebuild. */
  status(): Promise<NativeStatus>
  /** Native low-latency click. Fire and forget; the native side returns nothing. */
  tapSound(options: { kind: 'ui' | 'tasbih' | 'tasbih-complete' }): Promise<void> | void
}

export type FireResult =
  | 'posted'
  | 'notifications_disabled'
  | 'post_failed'
  | 'no_entry'
  | 'error'
  | 'boot'
  | 'package_replaced'
  | 'time_set'
  | 'timezone_event'
  | 'timezone_changed'

export interface FireLogItem {
  id: number
  title: string
  /** Planned fire time in epoch ms; 0 for events that are not alarms. */
  planned: number
  /** When the receiver ran, epoch ms. */
  at: number
  result: FireResult | string
  detail: string
}

export interface NativeStatus {
  ignoringBatteryOptimizations: boolean
  notificationsEnabled: boolean
  /** The time zone changed while the app was closed; prayer times are for the previous place until the app is opened. */
  needsReplan: boolean
  storedAlarms: number
}

export declare const ExactAlarms: ExactAlarmsPlugin
