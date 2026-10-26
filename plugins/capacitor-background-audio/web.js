// No background service is needed on the web: the browser keeps media playing
// in its own tabs and the OS handles background policies.
export const BackgroundAudioWeb = {
  async start() {},
  async stop() {},
  async isActive() {
    return { active: false }
  },
}
