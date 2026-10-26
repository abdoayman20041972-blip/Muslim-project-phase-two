import type { NotificationPermissionState } from '../../notifications/notifications'
import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useState } from 'react'
import { APP_SETTINGS_KEYS, emitSettingsChanged, readSetting, writeSetting } from '../../../settings'
import { toArabicNumber } from '../../../constants'
import { Toggle } from '../../../components/app-chrome'
import { Row, Section, Choice } from '../settingsPrimitives'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { readAdhanSoundMode } from '../../notifications/nativeNotifications'
import { NotificationDiagnostics } from './NotificationDiagnostics'
import { openSystemSettings } from '../../permissions/systemSettings'

type NotificationsSectionProps = {
  notificationStatus: NotificationPermissionState
  reminders?: boolean
  prayerTime?: boolean
  dailyAyah: boolean
  quranReminder?: boolean
  quranReminderTime?: string
  azkarMorning: boolean
  azkarEvening: boolean
  notify: () => Promise<boolean>
  toggleNotify: (key:string,setter:(value:boolean)=>void,value:boolean)=>Promise<void>
  setReminders?: Dispatch<SetStateAction<boolean>>
  setPrayerTime?: Dispatch<SetStateAction<boolean>>
  setDailyAyah: Dispatch<SetStateAction<boolean>>
  setQuranReminder?: Dispatch<SetStateAction<boolean>>
  setQuranReminderTime?: Dispatch<SetStateAction<string>>
  setAzkarMorning: Dispatch<SetStateAction<boolean>>
  setAzkarEvening: Dispatch<SetStateAction<boolean>>
}


export function NotificationsSection({
  notificationStatus,reminders=false,prayerTime=true,dailyAyah,quranReminder=false,quranReminderTime='20:00',azkarMorning,azkarEvening,notify,toggleNotify,
  setReminders=()=>{},setPrayerTime=()=>{},setDailyAyah,setQuranReminder=()=>{},setQuranReminderTime=()=>{},setAzkarMorning,setAzkarEvening,
}: NotificationsSectionProps) {
  const [adhanSound,setAdhanSound] = useState(readAdhanSoundMode)
  const [ayahTime,setAyahTime] = useState(() => readSetting(APP_SETTINGS_KEYS.dailyAyahTime, '09:00'))
  // One-time battery hint: some phone makers stop background alarms unless the app is exempt.
  const BATTERY_HINT_KEY = 'muslim_battery_hint_seen'
  const [batteryHintSeen,setBatteryHintSeen] = useState(() => { try { return localStorage.getItem(BATTERY_HINT_KEY) === '1' } catch (error) { console.error('[notifications] battery hint flag unreadable', error); return true } })
  const dismissBatteryHint = () => { try { localStorage.setItem(BATTERY_HINT_KEY,'1') } catch (error) { console.error('[notifications] battery hint flag not saved', error) } setBatteryHintSeen(true) }
  const native = Capacitor.isNativePlatform()
  const [nativeStatus,setNativeStatus] = useState('')

  const askNative = async () => {
    try {
      const res = await LocalNotifications.requestPermissions()
      setNativeStatus(res.display)
      emitSettingsChanged()
    } catch (error) {
      console.error('[notifications] permission request failed', error)
      setNativeStatus('denied')
    }
  }

  useEffect(() => {
    if (!native) return
    void LocalNotifications.checkPermissions().then(s => setNativeStatus(s.display)).catch((error) => console.error('[notifications] permission check failed', error))
  }, [native])


  return (
    <>
    <Section title="مركز الإشعارات">
      <Row title="السماح بالإشعارات" description={native ? 'تصل الإشعارات داخل التطبيق حتى بعد إغلاقه.' : undefined}>
        <button onClick={() => void (native ? (nativeStatus === 'denied' ? openSystemSettings('notifications') : askNative()) : notify())} className="rounded-xl bg-azkar-teal px-3 py-2 text-[10px] font-bold text-azkar-card">
          {(native ? nativeStatus : notificationStatus) === 'granted' ? 'مسموحة' : native && nativeStatus === 'denied' ? 'فتح الإعدادات' : 'السماح'}
        </button>
      </Row>
      {native && nativeStatus === 'granted' && !batteryHintSeen && (
        <Row title="لضمان وصول الأذان في وقته" description="اسمح للتطبيق بالعمل دون قيود البطارية، فبعض الهواتف توقف التنبيهات في الخلفية.">
          <div className="flex shrink-0 flex-col gap-2">
            <button type="button" className="rounded-xl bg-azkar-teal px-3 py-2 text-[10px] font-bold text-azkar-card" onClick={() => { void openSystemSettings('battery'); dismissBatteryHint() }}>فتح الإعدادات</button>
            <button type="button" className="rounded-xl border border-azkar-gold-soft px-3 py-2 text-[10px] font-bold text-azkar-teal-ink" onClick={dismissBatteryHint}>لاحقًا</button>
          </div>
        </Row>
      )}
      <Row title="تذكير الصلاة" description="إشعار مستقل عند دخول وقت الصلاة.">
        <Toggle checked={prayerTime} onChange={() => void toggleNotify(APP_SETTINGS_KEYS.prayerTime,setPrayerTime,prayerTime)} label="تذكير الصلاة"/>
      </Row>
      <Row title="صوت الأذان" description={Capacitor.isNativePlatform() ? 'صوت التنبيه عند دخول وقت الصلاة' : 'يعمل داخل تطبيق أندرويد'} stacked>
        <Choice
          current={adhanSound}
          onChange={(v) => {
            setAdhanSound(v as typeof adhanSound)
            writeSetting('adhan_sound', v)
            emitSettingsChanged()
          }}
          labels={{ adhan: 'صوت الأذان', default: 'نغمة النظام', silent: 'صامت' }}
        />
      </Row>
      <Row title={`تذكير قبل الصلاة بـ${toArabicNumber(5)} دقائق`} description="إشعار مستقل قبل كل صلاة بخمس دقائق.">
        <Toggle checked={reminders} onChange={() => void toggleNotify(APP_SETTINGS_KEYS.reminders,setReminders,reminders)} label={`قبل الصلاة بـ${toArabicNumber(5)} دقائق`}/>
      </Row>
      <Row title="آية اليوم" description="إشعار يومي في الوقت الذي تحدده، افتراضيًا ٩ صباحًا.">
        <div className="flex flex-col items-end gap-2">
          <Toggle checked={dailyAyah} onChange={() => void toggleNotify(APP_SETTINGS_KEYS.dailyAyah,setDailyAyah,dailyAyah)} label="آية اليوم"/>
          {dailyAyah && <input aria-label="وقت إشعار آية اليوم" type="time" value={ayahTime} onChange={(event) => { const value=event.target.value; if (!value) return; setAyahTime(value); writeSetting(APP_SETTINGS_KEYS.dailyAyahTime,value); emitSettingsChanged() }} className="min-w-[7rem] rounded-xl border border-azkar-gold-soft bg-azkar-card px-3 py-2 text-[13px]" />}
        </div>
      </Row>
      <Row title="تذكير قراءة القرآن" description="تذكير يومي يفتح المصحف في الوقت الذي تحدده.">
        <div className="flex flex-col items-end gap-2">
          <Toggle checked={quranReminder} onChange={() => void toggleNotify(APP_SETTINGS_KEYS.quranReminder,setQuranReminder,quranReminder)} label="قراءة القرآن"/>
          {quranReminder && <input aria-label="وقت تذكير قراءة القرآن" type="time" value={quranReminderTime} onChange={(event) => { const value=event.target.value; setQuranReminderTime(value); writeSetting(APP_SETTINGS_KEYS.quranReminderTime,value); emitSettingsChanged() }} className="min-w-[7rem] rounded-xl border border-azkar-gold-soft bg-azkar-card px-3 py-2 text-[13px]" />}
        </div>
      </Row>
      <Row title="أذكار الصباح" description="عند وقت الشروق وفق مواقيت الصلاة المحفوظة">
        <Toggle checked={azkarMorning} onChange={() => void toggleNotify(APP_SETTINGS_KEYS.azkarMorning,setAzkarMorning,azkarMorning)} label="أذكار الصباح"/>
      </Row>
      <Row title="أذكار المساء" description="عند وقت الغروب وفق مواقيت الصلاة المحفوظة" last>
        <Toggle checked={azkarEvening} onChange={() => void toggleNotify(APP_SETTINGS_KEYS.azkarEvening,setAzkarEvening,azkarEvening)} label="أذكار المساء"/>
      </Row>
    </Section>
    {native && <NotificationDiagnostics />}
    </>
  )
}