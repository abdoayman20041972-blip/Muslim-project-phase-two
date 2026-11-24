import { normalizeCoords } from './features/location/coords'

// Import safety net: a backup file is untrusted input. Key names are already
// filtered by isBackupKey; this checks that the value of each key has the shape
// its reader expects, so one damaged entry cannot install data a screen would
// choke on. Unknown or free-form keys (plain preferences) are accepted as long
// as they are strings of sane size, which keeps old backups importable.
const MAX_VALUE_LENGTH = 2_000_000
const TIME_KEYS = new Set([
  'azkar_daily_ayah_time',
  'azkar_quran_reading_reminder_time',
  'azkar_azkar_morning_time',
  'azkar_azkar_evening_time',
  'azkar_friday_kahf_time',
])
const NUMBER_RECORD_KEYS = new Set(['azkar_counts', 'azkar_tasbih_rounds', 'azkar_tasbih_round_counts', 'azkar_tasbih_daily_history'])
const ARRAY_KEYS = new Set(['azkar_favorites', 'azkar_custom_tasbih_list'])
const OBJECT_KEYS = new Set(['azkar_azkar_item_progress_v2', 'azkar_azkar_occasion_progress_v1', 'azkar_journey_position'])
// Preference keys whose readers accept a closed set of values. The sets come
// from the Settings controls and the readers themselves (labels/option lists).
const ENUM_KEYS: Record<string, readonly string[]> = {
  azkar_theme_color: ['teal', 'blue', 'purple', 'rose', 'amber'],
  azkar_appearance: ['light', 'dark', 'system'],
  azkar_number_style: ['arabic', 'western'],
  azkar_time_format: ['24', '12'],
  azkar_ui_scale: ['sm', 'md', 'lg'],
  adhan_sound: ['adhan', 'default', 'silent'],
  azkar_tafsir_source: ['muyassar', 'saddi', 'ibnKathir', 'tabari'],
  azkar_prayer_calc_method: ['1', '2', '3', '4', '5'],
  azkar_asr_school: ['0', '1'],
  azkar_reading_layout: ['scroll', 'pages'],
  azkar_tasbih_button_color: ['teal', 'gold', 'blue', 'rose'],
  azkar_azkar_font_size: ['s', 'm', 'l'],
  hadith_font: ['sm', 'md', 'lg'],
  prophet_font: ['sm', 'md', 'lg'],
  azkar_font_size: ['sm', 'md', 'lg', 'xl'],
  azkar_prayer_reminder_lead: ['5', '10', '15', '20', '30'],
}
const COUNT_KEYS = new Set(['azkar_day_total', 'azkar_khatmah_page', 'azkar_khatmah_target'])

const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v))

function parseJson(value: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(value) }
  } catch {
    return { ok: false }
  }
}

export function isValidBackupValue(key: string, value: unknown): value is string {
  if (typeof value !== 'string' || value.length > MAX_VALUE_LENGTH) return false
  if (key in ENUM_KEYS) return ENUM_KEYS[key].includes(value)
  if (TIME_KEYS.has(key)) return value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  if (COUNT_KEYS.has(key)) return /^\d{1,9}$/.test(value)
  if (key === 'azkar_coords') {
    if (value === 'null') return true
    const p = parseJson(value)
    return p.ok && normalizeCoords(p.value) !== null
  }
  if (NUMBER_RECORD_KEYS.has(key)) {
    const p = parseJson(value)
    return p.ok && isRecord(p.value) && Object.values(p.value).every((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0)
  }
  if (ARRAY_KEYS.has(key)) {
    const p = parseJson(value)
    return p.ok && Array.isArray(p.value)
  }
  if (OBJECT_KEYS.has(key)) {
    const p = parseJson(value)
    return p.ok && isRecord(p.value)
  }
  return true
}

export function validateBackupEntries(
  data: Record<string, unknown>,
  isKnownKey: (key: string) => boolean,
): { valid: [string, string][]; rejected: string[] } {
  const valid: [string, string][] = []
  const rejected: string[] = []
  for (const [k, v] of Object.entries(data)) {
    if (!isKnownKey(k)) continue
    if (isValidBackupValue(k, v)) valid.push([k, v])
    else rejected.push(k)
  }
  return { valid, rejected }
}
