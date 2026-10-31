export const APP_SETTINGS_KEYS = {
  darkMode:'azkar_dark_mode', appearance:'azkar_appearance', numberStyle:'azkar_number_style', timeFormat:'azkar_time_format', uiScale:'azkar_ui_scale',
  reducedMotion:'azkar_reduced_motion', keepScreenAwake:'azkar_keep_screen_awake', restoreLastPage:'azkar_restore_last_page',
  uiSound:'azkar_ui_sound_enabled', tasbihSound:'azkar_tasbih_sound_enabled', vibration:'azkar_vibration_enabled',
  reminders:'azkar_reminders_on', prayerTime:'azkar_prayer_time_notifications', dailyAyah:'azkar_daily_ayah_notifications', dailyAyahTime:'azkar_daily_ayah_time', quranReminder:'azkar_quran_reading_reminder', quranReminderTime:'azkar_quran_reading_reminder_time', azkarMorning:'azkar_azkar_morning_reminders', azkarEvening:'azkar_azkar_evening_reminders',
  tafsirSource:'azkar_tafsir_source', khatmahPage:'azkar_khatmah_page', khatmahTarget:'azkar_khatmah_target',
  prayerCalcMethod:'azkar_prayer_calc_method', asrSchool:'azkar_asr_school', prayerReminderLead:'azkar_prayer_reminder_lead', coords:'azkar_coords', prayerLocationUpdatedAt:'azkar_prayer_location_updated_at',
  fontSize:'azkar_font_size', reciter:'azkar_reciter', readingLayout:'azkar_reading_layout',
  hijriCalendar:'azkar_hijri_calendar', tasbihButtonShape:'azkar_tasbih_button_shape', tasbihButtonColor:'azkar_tasbih_button_color',
  dataSaver:'azkar_data_saver', customTasbih:'azkar_custom_tasbih',
  azkarCounterEnabled:'azkar_counter_enabled',
  journeyAutoAdvance:'azkar_journey_auto_advance',
  hadithShowNote:'azkar_hadith_show_note',
  prophetShowQuestion:'azkar_prophet_show_question',
} as const
export function readSetting(key:string,fallback=''){try{return localStorage.getItem(key)??fallback}catch{return fallback}}
export function writeSetting(key:string,value:string){try{localStorage.setItem(key,value)}catch(error){console.error('[settings] could not save',key,error)}}
export const emitSettingsChanged=()=>window.dispatchEvent(new Event('azkar-settings-changed'))
try{localStorage.removeItem('azkar_app_lock_enabled');localStorage.removeItem('azkar_app_lock_pin')}catch (error) { console.debug('[settings]', error) }

export const BACKUP_KEYS = new Set<string>([
  APP_SETTINGS_KEYS.darkMode,APP_SETTINGS_KEYS.appearance,APP_SETTINGS_KEYS.numberStyle,APP_SETTINGS_KEYS.timeFormat,APP_SETTINGS_KEYS.uiScale,
  APP_SETTINGS_KEYS.reducedMotion,APP_SETTINGS_KEYS.keepScreenAwake,APP_SETTINGS_KEYS.restoreLastPage,APP_SETTINGS_KEYS.uiSound,APP_SETTINGS_KEYS.tasbihSound,
  APP_SETTINGS_KEYS.vibration,APP_SETTINGS_KEYS.reminders,APP_SETTINGS_KEYS.prayerTime,APP_SETTINGS_KEYS.dailyAyah,APP_SETTINGS_KEYS.dailyAyahTime,APP_SETTINGS_KEYS.quranReminder,APP_SETTINGS_KEYS.quranReminderTime,APP_SETTINGS_KEYS.azkarMorning,APP_SETTINGS_KEYS.azkarEvening,
  APP_SETTINGS_KEYS.tafsirSource,APP_SETTINGS_KEYS.khatmahPage,APP_SETTINGS_KEYS.khatmahTarget,APP_SETTINGS_KEYS.prayerCalcMethod,
  APP_SETTINGS_KEYS.asrSchool,APP_SETTINGS_KEYS.prayerReminderLead,APP_SETTINGS_KEYS.coords,APP_SETTINGS_KEYS.prayerLocationUpdatedAt,APP_SETTINGS_KEYS.fontSize,
  APP_SETTINGS_KEYS.reciter,APP_SETTINGS_KEYS.readingLayout,APP_SETTINGS_KEYS.hijriCalendar,APP_SETTINGS_KEYS.tasbihButtonShape,APP_SETTINGS_KEYS.tasbihButtonColor,APP_SETTINGS_KEYS.dataSaver,APP_SETTINGS_KEYS.customTasbih,
  APP_SETTINGS_KEYS.azkarCounterEnabled,APP_SETTINGS_KEYS.journeyAutoAdvance,APP_SETTINGS_KEYS.hadithShowNote,APP_SETTINGS_KEYS.prophetShowQuestion,'azkar_theme_color','azkar_counts','azkar_day_total','azkar_day_total_date',
  'azkar_tasbih_selected_word','azkar_tasbih_rounds','azkar_tasbih_round_counts','azkar_tasbih_daily_history','azkar_custom_tasbih','azkar_custom_tasbih_list',
  'azkar_azkar_item_progress_v2','azkar_azkar_item_progress_v2_migrated','azkar_favorites','azkar_favorites_version','azkar_last_surah','azkar_last_view',
  'azkar_journey_position','azkar_daily_ayah','azkar_reciter'
])
export function isBackupKey(key:string){return BACKUP_KEYS.has(key) || key.startsWith('azkar_tafsir_')}