import { registerPlugin } from '@capacitor/core'

const BackgroundAudio = registerPlugin('BackgroundAudio', {
  web: () => import('./web.js').then((m) => m.BackgroundAudioWeb),
})

export { BackgroundAudio }
