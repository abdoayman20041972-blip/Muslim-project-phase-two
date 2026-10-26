import { useEffect } from 'react'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'

export function useUiScaleSync() {
  useEffect(() => {
    const root = document.documentElement
    const sync = () => {
      root.dataset.uiScale = readSetting(APP_SETTINGS_KEYS.uiScale, 'md')
      root.classList.toggle(
        'reduce-motion',
        readSetting(APP_SETTINGS_KEYS.reducedMotion, '0') === '1',
      )
      root.dataset.theme = readSetting('azkar_theme_color', 'teal')
    }
    sync()
    window.addEventListener('azkar-settings-changed', sync)
    return () => window.removeEventListener('azkar-settings-changed', sync)
  }, [])
}
