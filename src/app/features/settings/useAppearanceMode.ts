import { useEffect, useState } from 'react'
import { APP_SETTINGS_KEYS, readSetting, writeSetting } from '../../settings'

export function useAppearanceMode(mounted: boolean) {
  const readInitialAppearance = () => {
    const savedAppearance = readSetting(APP_SETTINGS_KEYS.appearance, '')
    const legacyDark = readSetting(APP_SETTINGS_KEYS.darkMode)
    return (savedAppearance || (legacyDark === '1' ? 'dark' : 'light')) as
      | 'light'
      | 'dark'
      | 'system'
  }
  const [appearance, setAppearance] = useState<'light' | 'dark' | 'system'>(() =>
    readInitialAppearance(),
  )
  const [darkMode, setDarkMode] = useState(() => readInitialAppearance() === 'dark')

  useEffect(() => {
    const apply = () => {
      const system = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
      setDarkMode(appearance === 'system' ? system : appearance === 'dark')
    }
    apply()
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    media?.addEventListener('change', apply)
    return () => media?.removeEventListener('change', apply)
  }, [appearance])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    document.documentElement.dataset.theme = readSetting('azkar_theme_color', 'teal')
    if (mounted) {
      writeSetting(APP_SETTINGS_KEYS.appearance, appearance)
      writeSetting(APP_SETTINGS_KEYS.darkMode, darkMode ? '1' : '0')
    }
  }, [darkMode, appearance, mounted])

  return { darkMode, appearance, setAppearance }
}
