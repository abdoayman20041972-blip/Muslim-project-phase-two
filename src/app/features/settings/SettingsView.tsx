import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { getNotificationPermission, requestNotificationPermission } from '../notifications/notifications'
import {
  BellRing,
  BookOpen,
  CircleDot,
  Clock3,
  Info,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react'
import { useConfirmDialog } from '../../components/confirm-dialog'
import { useQuranPreferences } from '../quran/useQuranPreferences'
import { APP_SETTINGS_KEYS, emitSettingsChanged, readSetting, writeSetting, isBackupKey } from '../../settings'
import { AboutSection } from './sections/AboutSection'
import { DeviceSection } from './sections/DeviceSection'
import { HadithSection, ProphetsSection } from './sections/HadithProphetsSection'
import { NotificationsSection } from './sections/NotificationsSection'
import { AzkarSection } from './sections/AzkarSection'
import { PrayerSection } from './sections/PrayerSection'
import { QuranSection } from './sections/QuranSection'
import { TasbihSection } from './sections/TasbihSection'
import { MotivationSection } from './sections/MotivationSection'
import { PrivacySection } from './sections/PrivacySection'
import { GeneralSection } from './sections/GeneralSection'

type Props = {
  darkMode: boolean
  appearance: 'light' | 'dark' | 'system'
  onAppearance: (v: 'light' | 'dark' | 'system') => void
  onBack: () => void
}
type Category =
  | 'main'
  | 'general'
  | 'quran'
  | 'azkar'
  | 'tasbih'
  | 'prayer'
  | 'notifications'
  | 'device'
  | 'hadith'
  | 'prophets'
  | 'motivation'
  | 'privacy'
  | 'about'
const CATEGORY_GROUPS: ReadonlyArray<readonly [string, ReadonlyArray<readonly [Category, string, string, typeof Settings2]>]> = [
  ['المظهر والقراءة', [
    ['general', 'عام', 'المظهر والأرقام والحركة', Settings2],
    ['quran', 'المصحف', 'الخط والقارئ والتفسير', BookOpen],
  ]],
  ['العبادة والتذكير', [
    ['prayer', 'الصلاة', 'الحساب والتذكيرات', Clock3],
    ['notifications', 'الإشعارات', 'الأذان والتنبيهات', BellRing],
    ['azkar', 'الأذكار', 'التفضيلات والكاش', Sparkles],
    ['tasbih', 'السبحة', 'الصوت والاهتزاز', CircleDot],
    ['hadith', 'الأحاديث', 'حجم الخط والملاحظات', ScrollText],
    ['prophets', 'قصص الأنبياء', 'الخط وأسئلة التأمل', Star],
  ]],
  ['الجهاز والبيانات', [
    ['device', 'الأذونات والجهاز', 'الإشعارات والموقع', ShieldCheck],
    ['privacy', 'الخصوصية والبيانات', 'النسخ الاحتياطي', Info],
    ['motivation', 'التحفيز', 'إحصائيات السبحة والختمة', TrendingUp],
  ]],
  ['حول مسلم', [
    ['about', 'حول مسلم', 'معلومات التطبيق والتواصل', Info],
  ]],
]

export function SettingsView({ appearance, onAppearance, onBack }: Props) {
  const { confirm, alert } = useConfirmDialog()
  const { fontSize, setFontSize, reciter, setReciter, layout, setLayout } = useQuranPreferences()
  const [category, setCategory] = useState<Category>('main')
  const [uiSound, setUiSound] = useState(true),
    [tasbihSound, setTasbihSound] = useState(true),
    [vibration, setVibration] = useState(true),
    [reminders, setReminders] = useState(false),
    [prayerTime, setPrayerTime] = useState(true)
  const [dailyAyah, setDailyAyah] = useState(false),
    [azkarMorning, setAzkarMorning] = useState(false),
    [azkarEvening, setAzkarEvening] = useState(false),
    [quranReminder, setQuranReminder] = useState(false),
    [quranReminderTime, setQuranReminderTime] = useState('20:00'),
    [azkarCounter, setAzkarCounter] = useState(
      readSetting(APP_SETTINGS_KEYS.azkarCounterEnabled, '1') !== '0',
    ),
    [journeyAutoAdvance, setJourneyAutoAdvance] = useState(
      readSetting(APP_SETTINGS_KEYS.journeyAutoAdvance, '0') === '1',
    )
  const [notificationStatus, setNotificationStatus] = useState(getNotificationPermission()),
    [calc, setCalc] = useState(readSetting(APP_SETTINGS_KEYS.prayerCalcMethod, '5')),
    [asr, setAsr] = useState(readSetting(APP_SETTINGS_KEYS.asrSchool, '0'))
  const [timeFormat, setTimeFormat] = useState(readSetting(APP_SETTINGS_KEYS.timeFormat, '24')),
    [tafsir, setTafsir] = useState(readSetting(APP_SETTINGS_KEYS.tafsirSource, 'muyassar')),
    [numberStyle, setNumberStyle] = useState(readSetting(APP_SETTINGS_KEYS.numberStyle, 'arabic')),
    [uiScale, setUiScale] = useState(readSetting(APP_SETTINGS_KEYS.uiScale, 'md')),
    [reduced, setReduced] = useState(readSetting(APP_SETTINGS_KEYS.reducedMotion, '0') === '1'),
    [awake, setAwake] = useState(readSetting(APP_SETTINGS_KEYS.keepScreenAwake, '0') === '1'),
    [restore, setRestore] = useState(readSetting(APP_SETTINGS_KEYS.restoreLastPage, '0') === '1')
  const [theme, setTheme] = useState(readSetting('azkar_theme_color', 'teal')),
    [hijri, setHijri] = useState(readSetting(APP_SETTINGS_KEYS.hijriCalendar, '1') !== '0'),
    [dataSaver, setDataSaver] = useState(readSetting(APP_SETTINGS_KEYS.dataSaver, '0') === '1'),
    [custom, setCustom] = useState(''),
    [customGoal, setCustomGoal] = useState('33'),
    [khatmahPage, setKhatmahPage] = useState(readSetting(APP_SETTINGS_KEYS.khatmahPage, '0')),
    [khatmahTarget, setKhatmahTarget] = useState(
      readSetting(APP_SETTINGS_KEYS.khatmahTarget, '604'),
    )
  useEffect(() => {
    setUiSound(readSetting(APP_SETTINGS_KEYS.uiSound, '1') !== '0')
    setTasbihSound(readSetting(APP_SETTINGS_KEYS.tasbihSound, '1') !== '0')
    setVibration(readSetting(APP_SETTINGS_KEYS.vibration, '1') !== '0')
    setReminders(readSetting(APP_SETTINGS_KEYS.reminders) === '1')
    setPrayerTime(readSetting(APP_SETTINGS_KEYS.prayerTime, '1') === '1')
    setDailyAyah(readSetting(APP_SETTINGS_KEYS.dailyAyah) === '1')
    setQuranReminder(readSetting(APP_SETTINGS_KEYS.quranReminder) === '1')
    setQuranReminderTime(readSetting(APP_SETTINGS_KEYS.quranReminderTime, '20:00'))
    const legacyAzkar = readSetting('azkar_azkar_reminders') === '1'
    const morning = readSetting(APP_SETTINGS_KEYS.azkarMorning, legacyAzkar ? '1' : '0') === '1'
    const evening = readSetting(APP_SETTINGS_KEYS.azkarEvening, legacyAzkar ? '1' : '0') === '1'
    setAzkarMorning(morning)
    setAzkarEvening(evening)
    if (legacyAzkar) {
      writeSetting(APP_SETTINGS_KEYS.azkarMorning, '1')
      writeSetting(APP_SETTINGS_KEYS.azkarEvening, '1')
      localStorage.removeItem('azkar_azkar_reminders')
    }
    setAzkarCounter(readSetting(APP_SETTINGS_KEYS.azkarCounterEnabled, '1') !== '0')
    setJourneyAutoAdvance(readSetting(APP_SETTINGS_KEYS.journeyAutoAdvance, '0') === '1')
  }, [])
  const save = (k: string, v: string) => {
    writeSetting(k, v)
    emitSettingsChanged()
  }
  const toggle = (k: string, set: (v: boolean) => void, v: boolean) => {
    const n = !v
    set(n)
    save(k, n ? '1' : '0')
  }
  const notify = async () => {
    // Inside the APK the web Notification API does not exist; use the native
    // local-notifications permission instead so feature toggles can be enabled.
    if (Capacitor.isNativePlatform()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications')
        const result = await LocalNotifications.requestPermissions()
        const granted = result.display === 'granted'
        setNotificationStatus(granted ? 'granted' : 'denied')
        return granted
      } catch {
        return false
      }
    }
    const p = await requestNotificationPermission()
    setNotificationStatus(p)
    return p === 'granted'
  }
  const toggleNotify = async (k: string, set: (v: boolean) => void, v: boolean) => {
    if (v) {
      toggle(k, set, v)
      return
    }
    if (await notify()) toggle(k, set, false)
  }
  const exportData = () => {
    const data: Record<string, string> = {}
    Object.keys(localStorage)
      .filter(isBackupKey)
      .forEach((k) => {
        const v = localStorage.getItem(k)
        if (v !== null) data[k] = v
      })
    const blob = new Blob(
      [
        JSON.stringify(
          {
            app: 'مسلم',
            format: 'muslim-local-backup',
            version: 2,
            exportedAt: new Date().toISOString(),
            data,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'muslim-backup-' + new Date().toISOString().slice(0, 10) + '.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const importData = async (file: File) => {
    try {
      const p = JSON.parse(await file.text())
      if (p?.format !== 'muslim-local-backup' || !p.data) throw 0
      const entries = Object.entries(p.data).filter(
        ([k, v]) => isBackupKey(k) && typeof v === 'string',
      ) as [string, string][]
      if (!entries.length) throw 0
      if (!(await confirm({ message: 'استبدال البيانات الحالية بالنسخة الاحتياطية؟' }))) return
      Object.keys(localStorage)
        .filter(isBackupKey)
        .forEach((k) => localStorage.removeItem(k))
      entries.forEach(([k, v]) => localStorage.setItem(k, v))
      location.reload()
    } catch {
      await alert({ message: 'ملف النسخة الاحتياطية غير صالح أو لا يخص تطبيق مسلم.' })
    }
  }
  const reset = async () => {
    if (
      !(await confirm({
        message: 'إعادة الإعدادات الافتراضية؟ سيتم مسح الإعدادات المخصصة وبعض بيانات التخصيص مثل العبارات المخصصة والختمة.',
        danger: true,
      }))
    )
      return
    const resetKeys = [
      APP_SETTINGS_KEYS.darkMode,
      APP_SETTINGS_KEYS.appearance,
      APP_SETTINGS_KEYS.numberStyle,
      APP_SETTINGS_KEYS.timeFormat,
      APP_SETTINGS_KEYS.uiScale,
      APP_SETTINGS_KEYS.reducedMotion,
      APP_SETTINGS_KEYS.keepScreenAwake,
      APP_SETTINGS_KEYS.restoreLastPage,
      APP_SETTINGS_KEYS.uiSound,
      APP_SETTINGS_KEYS.tasbihSound,
      APP_SETTINGS_KEYS.vibration,
      APP_SETTINGS_KEYS.reminders,
      APP_SETTINGS_KEYS.prayerTime,
      APP_SETTINGS_KEYS.dailyAyah,
      APP_SETTINGS_KEYS.quranReminder,
      APP_SETTINGS_KEYS.quranReminderTime,
      APP_SETTINGS_KEYS.azkarMorning,
      APP_SETTINGS_KEYS.azkarEvening,
      APP_SETTINGS_KEYS.tafsirSource,
      APP_SETTINGS_KEYS.khatmahPage,
      APP_SETTINGS_KEYS.khatmahTarget,
      APP_SETTINGS_KEYS.prayerCalcMethod,
      APP_SETTINGS_KEYS.asrSchool,
      APP_SETTINGS_KEYS.prayerReminderLead,
      APP_SETTINGS_KEYS.coords,
      APP_SETTINGS_KEYS.prayerLocationUpdatedAt,
      APP_SETTINGS_KEYS.fontSize,
      APP_SETTINGS_KEYS.reciter,
      APP_SETTINGS_KEYS.readingLayout,
      APP_SETTINGS_KEYS.hijriCalendar,
      APP_SETTINGS_KEYS.dataSaver,
      APP_SETTINGS_KEYS.customTasbih,
      APP_SETTINGS_KEYS.azkarCounterEnabled,
      'azkar_theme_color',
      'azkar_custom_tasbih',
      'azkar_custom_tasbih_list',
    ]
    resetKeys.forEach((k) => localStorage.removeItem(k))
    location.reload()
  }
  const back = () => (category === 'main' ? onBack() : setCategory('main'))
  if (category === 'main')
    return (
      <div className="animate-in fade-in duration-300" dir="rtl">
        <div className="mb-5 flex items-center gap-3">
          <button onClick={onBack} className="h-10 w-10 rounded-full border bg-azkar-card" aria-label="رجوع">
            ‹
          </button>
          <div>
            <div className="font-amiri text-2xl font-bold text-azkar-teal-ink">الإعدادات</div>
            <div className="text-[10px] text-azkar-ink-faint">كل التفضيلات في مكان واحد</div>
          </div>
        </div>

        {CATEGORY_GROUPS.map(([groupTitle, items]) => (
          <section key={groupTitle} className="mb-5" aria-label={groupTitle}>
            <h2 className="mb-2 px-1 font-amiri text-sm font-bold text-azkar-teal-ink">{groupTitle}</h2>
            <div className="grid grid-cols-2 gap-3">
              {items.map(([id, t, d, Icon]) => (
                <button
                  key={id}
                  onClick={() => setCategory(id)}
                  className="u-pressable flex min-h-[6.2rem] flex-col items-start gap-2 rounded-[var(--r-lg)] border border-azkar-gold-soft bg-azkar-card px-3 py-3 text-right shadow-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-azkar-teal-tint text-azkar-teal-ink">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <b className="font-amiri text-[15px] leading-5 text-azkar-teal-ink">{t}</b>
                  <span className="text-[9px] leading-4 text-azkar-ink-soft">{d}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  return (
    <div className="animate-in fade-in duration-200">
      <div className="mb-5 flex items-center gap-3">
        <button onClick={back} className="h-10 w-10 rounded-full border bg-azkar-card">
          ‹
        </button>
        <div className="font-amiri text-2xl font-bold text-azkar-teal-ink">
          {
            (
              {
                general: 'عام',
                quran: 'المصحف',
                azkar: 'الأذكار',
                tasbih: 'السبحة',
                prayer: 'الصلاة',
                notifications: 'الإشعارات',
                device: 'الأذونات والجهاز',
                hadith: 'الأحاديث',
                prophets: 'قصص الأنبياء',
                motivation: 'التحفيز',
                privacy: 'الخصوصية والبيانات',
                about: 'حول مسلم',
              } as Record<string, string>
            )[category]
          }
        </div>
      </div>
      {category === 'general' && (
        <GeneralSection
          theme={theme} setTheme={setTheme}
          appearance={appearance} onAppearance={onAppearance}
          numberStyle={numberStyle} setNumberStyle={setNumberStyle}
          uiScale={uiScale} setUiScale={setUiScale}
          uiSound={uiSound} setUiSound={setUiSound}
          reduced={reduced} setReduced={setReduced}
          awake={awake} setAwake={setAwake}
          restore={restore} setRestore={setRestore}
          hijri={hijri} setHijri={setHijri}
          dataSaver={dataSaver} setDataSaver={setDataSaver}
          save={save} toggle={toggle}
        />
      )}
      {category === 'quran' && (
        <QuranSection
          fontSize={fontSize}
          setFontSize={setFontSize}
          reciter={reciter}
          setReciter={setReciter}
          layout={layout}
          setLayout={setLayout}
          tafsir={tafsir}
          setTafsir={setTafsir}
          save={save}
        />
      )}
      {category === 'azkar' && (
        <AzkarSection
          azkarCounter={azkarCounter}
          setAzkarCounter={setAzkarCounter}
          journeyAutoAdvance={journeyAutoAdvance}
          setJourneyAutoAdvance={setJourneyAutoAdvance}
          toggle={toggle}
        />
      )}
      {category === 'tasbih' && (
        <TasbihSection
          tasbihSound={tasbihSound}
          setTasbihSound={setTasbihSound}
          vibration={vibration}
          setVibration={setVibration}
          custom={custom}
          setCustom={setCustom}
          customGoal={customGoal}
          setCustomGoal={setCustomGoal}
          toggle={toggle}
        />
      )}
      {category === 'prayer' && (
        <PrayerSection
          calc={calc} setCalc={setCalc}
          asr={asr} setAsr={setAsr}
          timeFormat={timeFormat} setTimeFormat={setTimeFormat}
          save={save}
        />
      )}
      {category === 'notifications' && (
        <NotificationsSection
          notificationStatus={notificationStatus}
          reminders={reminders}
          prayerTime={prayerTime}
          dailyAyah={dailyAyah}
          quranReminder={quranReminder}
          quranReminderTime={quranReminderTime}
          setQuranReminder={setQuranReminder}
          setQuranReminderTime={setQuranReminderTime}
          azkarMorning={azkarMorning}
          azkarEvening={azkarEvening}
          notify={notify}
          toggleNotify={toggleNotify}
          setReminders={setReminders}
          setPrayerTime={setPrayerTime}
          setDailyAyah={setDailyAyah}
          setAzkarMorning={setAzkarMorning}
          setAzkarEvening={setAzkarEvening}
        />
      )}
      {category === 'device' && <DeviceSection />}
      {category === 'hadith' && <HadithSection />}
      {category === 'prophets' && <ProphetsSection />}
      {category === 'motivation' && (
        <MotivationSection
          khatmahPage={khatmahPage}
          setKhatmahPage={setKhatmahPage}
          khatmahTarget={khatmahTarget}
          setKhatmahTarget={setKhatmahTarget}
          save={save}
        />
      )}
      {category === 'privacy' && (
        <PrivacySection
          hijri={hijri}
          exportData={exportData}
          importData={importData}
          reset={reset}
        />
      )}
      {category === 'about' && <AboutSection />}
    </div>
  )
}
