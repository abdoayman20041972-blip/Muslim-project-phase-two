export interface BackgroundAudioStartOptions {
  title?: string
  artist?: string
  /** Whether audio is playing (true, default) or paused. Updates the notification and lock screen. */
  playing?: boolean
  /** Position and duration in seconds, shown on the lock screen. */
  position?: number
  duration?: number
}
export type BackgroundAudioAction =
  | 'play' | 'pause' | 'stop' | 'seek'
  | 'focusLossTransient' | 'focusLoss' | 'focusGain' | 'noisy'
export interface BackgroundAudioPlugin {
  /** Starts the service, or updates it if already running. Idempotent. */
  start(options: BackgroundAudioStartOptions): Promise<void>
  stop(): Promise<void>
  setKeepScreenOn(options: { enabled: boolean }): Promise<void>
  isActive(): Promise<{ active: boolean }>
  notificationPermission(): Promise<{ granted: boolean }>
  requestNotificationPermission(): Promise<{ granted: boolean }>
  addListener(
    eventName: 'mediaAction',
    /** action is the control pressed; position (ms) is set only for 'seek'. */
    listener: (event: { action: BackgroundAudioAction; position?: number }) => void,
  ): Promise<{ remove: () => Promise<void> }>
}
export declare const BackgroundAudio: BackgroundAudioPlugin
