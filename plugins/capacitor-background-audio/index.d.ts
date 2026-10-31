export interface BackgroundAudioStartOptions { title?: string; artist?: string; url?: string }
export interface BackgroundAudioPlugin {
  start(options: BackgroundAudioStartOptions): Promise<void>
  prepare(options: BackgroundAudioStartOptions): Promise<void>
  play(options: BackgroundAudioStartOptions): Promise<void>
  stop(): Promise<void>
  setKeepScreenOn(options: { enabled: boolean }): Promise<void>
}
export declare const BackgroundAudio: BackgroundAudioPlugin
