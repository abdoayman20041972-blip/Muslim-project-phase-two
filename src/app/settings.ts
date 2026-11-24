export const APP_SETTINGS_KEYS = {
  darkMode:'azkar_dark_mode', appearance:'azkar_appearance', numberStyle:'azkar_number_style', timeFormat:'azkar_time_format', uiScale:'azkar_ui_scale',
  reducedMotion:'azkar_reduced_motion', keepScreenAwake:'azkar_keep_screen_awake', restoreLastPage:'azkar_restore_last_page',
  uiSound:'azkar_ui_sound_enabled', tasbihSound:'azkar_tasbih_sound_enabled', vibration:'azkar_vibration_enabled',
  reminders:'azkar_reminders_on', prayerTime:'azkar_prayer_time_notifications', dailyAyah:'azkar_daily_ayah_notifications', dailyAyahTime:'azkar_daily_ayah_time', quranReminder:'azkar_quran_reading_reminder', quranReminderTime:'azkar_quran_reading_reminder_time', azkarMorning:'azkar_azkar_morning_reminders', azkarEvening:'azkar_azkar_evening_reminders',
  azkarMorningTime:'azkar_azkar_morning_time', azkarEveningTime:'azkar_azkar_evening_time',
  tafsirSource:'azkar_tafsir_source', khatmahPage:'azkar_khatmah_page', khatmahTarget:'azkar_khatmah_target', readingPosition:'azkar_reading_position',
  prayerCalcMethod:'azkar_prayer_calc_method', asrSchool:'azkar_asr_school', prayerReminderLead:'azkar_prayer_reminder_lead', coords:'azkar_coords', prayerLocationUpdatedAt:'azkar_prayer_location_updated_at',
  fontSize:'azkar_font_size', reciter:'azkar_reciter', readingLayout:'azkar_reading_layout',
  hijriCalendar:'azkar_hijri_calendar', tasbihButtonColor:'azkar_tasbih_button_color',
  dataSaver:'azkar_data_saver', customTasbih:'azkar_custom_tasbih',
  azkarCounterEnabled:'azkar_counter_enabled',
  journeyAutoAdvance:'azkar_journey_auto_advance',
  azkarFontSize:'azkar_azkar_font_size',
  hadithShowNote:'azkar_hadith_show_note',
  hadithFont:'hadith_font', prophetFont:'prophet_font',
  prophetShowQuestion:'azkar_prophet_show_question',
  mutedPrayers:'azkar_muted_prayers', kahfReminder:'azkar_friday_kahf_reminder', kahfReminderTime:'azkar_friday_kahf_time',
} as const
export function readSetting(key:string,fallback=''){try{return localStorage.getItem(key)??fallback}catch{return fallback}}
export function writeSetting(key:string,value:string){try{localStorage.setItem(key,value)}catch(error){console.error('[settings] could not save',key,error)}}
export const emitSettingsChanged=()=>window.dispatchEvent(new Event('azkar-settings-changed'))

// Storage policy (single reference for the whole app):
// - localStorage is the one source of truth for settings and progress; every
//   screen reads and writes through readSetting/writeSetting or a shared store
//   built on them, never through ad-hoc localStorage keys.
// - BACKUP_KEYS below is the canonical list of what the export/import backup
//   and the native SharedPreferences mirror carry: settings plus user content
//   and progress (favorites, azkar progress, tasbih counts, reading position).
//   Downloaded audio lives in IndexedDB and is deliberately NOT in the backup.
// - SETTINGS_RESET_KEYS is the canonical list cleared by "reset settings":
//   preferences only. User content and progress (favorites, azkar progress,
//   tasbih counts, khatma page is a preference, reading position, last
//   surah/view, downloads) survive a reset.
// A new persistent key must be registered in APP_SETTINGS_KEYS (or documented
// here) and consciously added to or excluded from both lists.
// Derived caches are deliberately excluded from both: 'azkar_prayer_plan_cache_v1'
// (the last location-based prayer plan, re-armed verbatim while the location is
// unavailable) is rebuilt from live state on the next run with coordinates.
// Module runs on the server too (SSR); touch storage only in a browser.
if (typeof localStorage !== 'undefined') { try{localStorage.removeItem('azkar_app_lock_enabled');localStorage.removeItem('azkar_app_lock_pin')}catch (error) { console.debug('[settings]', error) } }

// Keys no screen reads or writes any more. They stay importable from old backups and
// are cleared by reset, but are no longer registered as settings.
export const LEGACY_UNUSED_KEYS:readonly string[]=['azkar_tasbih_button_shape']

export const BACKUP_KEYS = new Set<string>([
  ...LEGACY_UNUSED_KEYS,
  APP_SETTINGS_KEYS.darkMode,APP_SETTINGS_KEYS.appearance,APP_SETTINGS_KEYS.numberStyle,APP_SETTINGS_KEYS.timeFormat,APP_SETTINGS_KEYS.uiScale,
  APP_SETTINGS_KEYS.reducedMotion,APP_SETTINGS_KEYS.keepScreenAwake,APP_SETTINGS_KEYS.restoreLastPage,APP_SETTINGS_KEYS.uiSound,APP_SETTINGS_KEYS.tasbihSound,
  APP_SETTINGS_KEYS.vibration,APP_SETTINGS_KEYS.reminders,APP_SETTINGS_KEYS.prayerTime,APP_SETTINGS_KEYS.dailyAyah,APP_SETTINGS_KEYS.dailyAyahTime,APP_SETTINGS_KEYS.quranReminder,APP_SETTINGS_KEYS.quranReminderTime,APP_SETTINGS_KEYS.azkarMorning,APP_SETTINGS_KEYS.azkarEvening,
  APP_SETTINGS_KEYS.azkarMorningTime,APP_SETTINGS_KEYS.azkarEveningTime,
  APP_SETTINGS_KEYS.tafsirSource,APP_SETTINGS_KEYS.khatmahPage,APP_SETTINGS_KEYS.khatmahTarget,APP_SETTINGS_KEYS.prayerCalcMethod,
  APP_SETTINGS_KEYS.asrSchool,APP_SETTINGS_KEYS.prayerReminderLead,APP_SETTINGS_KEYS.coords,APP_SETTINGS_KEYS.prayerLocationUpdatedAt,APP_SETTINGS_KEYS.fontSize,
  APP_SETTINGS_KEYS.reciter,APP_SETTINGS_KEYS.readingLayout,APP_SETTINGS_KEYS.hijriCalendar,APP_SETTINGS_KEYS.tasbihButtonColor,APP_SETTINGS_KEYS.dataSaver,APP_SETTINGS_KEYS.customTasbih,
  APP_SETTINGS_KEYS.azkarCounterEnabled,APP_SETTINGS_KEYS.journeyAutoAdvance,APP_SETTINGS_KEYS.azkarFontSize,APP_SETTINGS_KEYS.hadithShowNote,APP_SETTINGS_KEYS.hadithFont,APP_SETTINGS_KEYS.prophetFont,APP_SETTINGS_KEYS.prophetShowQuestion,APP_SETTINGS_KEYS.mutedPrayers,APP_SETTINGS_KEYS.kahfReminder,APP_SETTINGS_KEYS.kahfReminderTime,APP_SETTINGS_KEYS.readingPosition,'azkar_theme_color','azkar_counts','azkar_day_total','azkar_day_total_date',
  'azkar_tasbih_selected_word','azkar_tasbih_rounds','azkar_tasbih_round_counts','azkar_tasbih_daily_history','azkar_custom_tasbih','azkar_custom_tasbih_list',
  'azkar_azkar_item_progress_v2','azkar_azkar_item_progress_v2_migrated','azkar_azkar_occasion_progress_v1','azkar_azkar_occasion_migrated_v1','azkar_favorites','azkar_favorites_version','azkar_last_surah','azkar_last_view',
  'azkar_journey_position','azkar_daily_ayah'
])
export function isBackupKey(key:string){return BACKUP_KEYS.has(key) || key.startsWith('azkar_tafsir_')}

// Canonical reset list for "إعادة الإعدادات الافتراضية": every registered
// preference, plus the theme color and the custom tasbih list, which the reset
// dialog already promises to clear (azkar_custom_tasbih is already a registered
// key). Progress and content keys (azkar_last_surah, azkar_last_view,
// readingPosition, favorites, azkar/tasbih progress) and the downloaded audio
// are NOT reset.
export const SETTINGS_RESET_KEYS:readonly string[]=[
  ...Object.values(APP_SETTINGS_KEYS).filter((key)=>key!==APP_SETTINGS_KEYS.readingPosition),
  'azkar_theme_color','azkar_custom_tasbih_list',...LEGACY_UNUSED_KEYS,
]
