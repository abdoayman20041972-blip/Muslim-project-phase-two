import { APP_SETTINGS_KEYS, readSetting } from '../../settings'

// Color-only customization for the tasbih count button (the user explicitly
// asked for color WITHOUT the old shape variants). The default matches the
// redesign's teal.
export const TASBIH_BUTTON_COLORS = ['teal', 'gold', 'blue', 'rose'] as const
export type TasbihButtonColor = (typeof TASBIH_BUTTON_COLORS)[number]

export const TASBIH_BUTTON_COLOR_LABELS: Record<TasbihButtonColor, string> = {
  teal: 'الأخضر المزرق',
  gold: 'الذهبي',
  blue: 'الأزرق',
  rose: 'الوردي',
}

export function getTasbihButtonColor(): TasbihButtonColor {
  const saved = readSetting(APP_SETTINGS_KEYS.tasbihButtonColor, 'teal')
  return (TASBIH_BUTTON_COLORS as readonly string[]).includes(saved) ? (saved as TasbihButtonColor) : 'teal'
}
