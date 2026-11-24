import type { NotificationPermissionState } from '../../notifications/notificationPermission'
import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useState } from 'react'
import { APP_SETTINGS_KEYS, emitSettingsChanged, readSetting, writeSetting } from '../../../settings'
import { toArabicNumber } from '../../../constants'
import { LABELS, PRAYERS } from '../../notifications/notificationPlan'
import { Toggle } from '../../../components/app-chrome'
import { Row, Section, Choice } from '../settingsPrimitives'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { readAdhanSoundMode, readMutedPrayers } from '../../notifications/nativeNotifications'
import { checkExactAlarm, openExactAlarmSettings } from '../../notifications/nativeNotifications'
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
  const [lead,setLead] = useState(() => { const n = Number(readSetting(APP_SETTINGS_KEYS.prayerReminderLead,'5')); return [5,10,15,20,30].includes(n) ? String(n) : '5' })
  const [muted,setMuted] = useState<string[]>(readMutedPrayers)
  const [kahf,setKahf] = useState(() => readSetting(APP_SETTINGS_KEYS.kahfReminder,'0') === '1')
  const [kahfTime,setKahfTime] = useState(() => readSetting(APP_SETTINGS_KEYS.kahfReminderTime,'10:00'))
  const [denied,setDenied] = useState(false)
  const togglePrayer = (name: string) => {
    const next = muted.includes(name) ? muted.filter((n) => n !== name) : [...muted, name]
    setMuted(next)
    writeSetting(APP_SETTINGS_KEYS.mutedPrayers, next.join(','))
    emitSettingsChanged()
  }
  // A turn-on that the system permission blocked used to do nothing, silently.
  const guarded = async (key: string, setter: (value: boolean) => void, value: boolean) => {
    setDenied(false)
    await toggleNotify(key, setter, value)
    if (!value && readSetting(key, '0') !== '1') setDenied(true)
  }
  const [ayahTime,setAyahTime] = useState(() => readSetting(APP_SETTINGS_KEYS.dailyAyahTime, '09:00'))
  // One-time battery hint: some phone makers stop background alarms unless the app is exempt.
  const BATTERY_HINT_KEY = 'muslim_battery_hint_seen'
  const [batteryHintSeen,setBatteryHintSeen] = useState(() => { try { return localStorage.getItem(BATTERY_HINT_KEY) === '1' } catch (error) { console.error('[notifications] battery hint flag unreadable', error); return true } })
  const dismissBatteryHint = () => { try { localStorage.setItem(BATTERY_HINT_KEY,'1') } catch (error) { console.error('[notifications] battery hint flag not saved', error) } setBatteryHintSeen(true) }
  const native = Capacitor.isNativePlatform()
  const [nativeStatus,setNativeStatus] = useState('')
  // Exact alarms (Android 12+): without them the OS defers our alarms in
  // Doze and the adhan can arrive hours late. Surfaced here with a direct
  // fix button so the user never has to hunt for it.
  const [exactAlarm,setExactAlarm] = useState('unknown')
  const refreshExactAlarm = () => {
    if (!native) return
    void checkExactAlarm().then((state) => setExactAlarm(state))
  }
  useEffect(() => {
    if (!native) return
    refreshExactAlarm()
    const onFocus = () => refreshExactAlarm()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [native])

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
      <Row title="السماح بالإشعارات" description={native ? (nativeStatus === 'denied' ? 'الإشعارات مغلقة من النظام، فلن يصلك أي تنبيه حتى تسمح بها.' : 'تصل الإشعارات داخل التطبيق حتى بعد إغلاقه.') : undefined}>
        <button onClick={() => void (native ? (nativeStatus === 'denied' ? openSystemSettings('notifications') : askNative()) : notify())} className="rounded-xl bg-azkar-teal px-3 py-2 text-[10px] font-bold text-azkar-card">
          {(native ? nativeStatus : notificationStatus) === 'granted' ? 'مسموحة' : native && nativeStatus === 'denied' ? 'فتح الإعدادات' : 'السماح'}
        </button>
      </Row>
      {native && exactAlarm !== 'granted' && exactAlarm !== 'unknown' && (
        <Row title="تنبيهات في وقتها بالضبط" description="بدون «المنبّهات والتذكيرات» قد يؤذن التطبيق متأخرًا. فعّلها من إعدادات النظام ثم ارجع هنا.">
          <button
            type="button"
            className="shrink-0 rounded-xl bg-azkar-teal px-3 py-2 text-[10px] font-bold text-azkar-card"
            onClick={() => {
              void openExactAlarmSettings().then((state) => setExactAlarm(state))
            }}
          >
            تفعيل
          </button>
        </Row>
      )}
      {native && nativeStatus === 'granted' && !batteryHintSeen && (
        <Row title="لضمان وصول الأذان في وقته" description="اسمح للتطبيق بالعمل دون قيود البطارية، فبعض الهواتف توقف التنبيهات في الخلفية.">
          <div className="flex shrink-0 flex-col gap-2">
            <button type="button" className="rounded-xl bg-azkar-teal px-3 py-2 text-[10px] font-bold text-azkar-card" onClick={() => { void openSystemSettings('battery'); dismissBatteryHint() }}>فتح الإعدادات</button>
            <button type="button" className="rounded-xl border border-azkar-gold-soft px-3 py-2 text-[10px] font-bold text-azkar-teal-ink" onClick={dismissBatteryHint}>لاحقًا</button>
          </div>
        </Row>
      )}
      <Row title="تذكير الصلاة" description="إشعار مستقل عند دخول وقت الصلاة.">
        <Toggle checked={prayerTime} onChange={() => void guarded(APP_SETTINGS_KEYS.prayerTime,setPrayerTime,prayerTime)} label="تذكير الصلاة"/>
      </Row>
      {denied && (
        <Row title="لم يتم التفعيل" description="الإذن بالإشعارات مرفوض. اسمح بها من إعدادات النظام ثم فعّل التذكير مرة أخرى.">
          <button type="button" className="shrink-0 rounded-xl bg-azkar-teal px-3 py-2 text-[10px] font-bold text-azkar-card" onClick={() => void openSystemSettings('notifications')}>فتح الإعدادات</button>
        </Row>
      )}
      <Row title="الصلوات المفعّلة" description="أوقف أي صلاة لا تريد إشعارها، وتنطبق على الأذان والتذكير قبله." stacked>
        <div dir="rtl" className="grid w-full grid-cols-5 gap-2">
          {PRAYERS.map((name) => {
            const on = !muted.includes(name)
            return (
              <button key={name} type="button" aria-pressed={on} onClick={() => togglePrayer(name)} className={`rounded-xl border px-1 py-2 text-[11px] font-bold ${on ? 'border-azkar-teal bg-azkar-teal text-azkar-card' : 'border-azkar-gold-soft text-azkar-teal-ink'}`}>
                {LABELS[name]}
              </button>
            )
          })}
        </div>
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
      <Row title="تذكير قبل الصلاة" description={`إشعار مستقل قبل كل صلاة بـ${toArabicNumber(Number(lead))} ${Number(lead) <= 10 ? 'دقائق' : 'دقيقة'}.`}>
        <Toggle checked={reminders} onChange={() => void guarded(APP_SETTINGS_KEYS.reminders,setReminders,reminders)} label={`قبل الصلاة بـ${toArabicNumber(Number(lead))} ${Number(lead) <= 10 ? 'دقائق' : 'دقيقة'}`}/>
      </Row>
      {reminders && (
        <Row title="مدة التذكير قبل الصلاة" stacked>
          <Choice
            current={lead}
            onChange={(v) => { setLead(v); writeSetting(APP_SETTINGS_KEYS.prayerReminderLead, v); emitSettingsChanged() }}
            labels={{ '5': `${toArabicNumber(5)} د`, '10': `${toArabicNumber(10)} د`, '15': `${toArabicNumber(15)} د`, '20': `${toArabicNumber(20)} د`, '30': `${toArabicNumber(30)} د` }}
          />
        </Row>
      )}
      <Row title="آية اليوم" description="إشعار يومي في الوقت الذي تحدده، افتراضيًا ٩ صباحًا.">
        <div className="flex flex-col items-end gap-2">
          <Toggle checked={dailyAyah} onChange={() => void guarded(APP_SETTINGS_KEYS.dailyAyah,setDailyAyah,dailyAyah)} label="آية اليوم"/>
          {dailyAyah && <input aria-label="وقت إشعار آية اليوم" type="time" value={ayahTime} onChange={(event) => { const value=event.target.value; if (!value) return; setAyahTime(value); writeSetting(APP_SETTINGS_KEYS.dailyAyahTime,value); emitSettingsChanged() }} className="min-w-[7rem] rounded-xl border border-azkar-gold-soft bg-azkar-card px-3 py-2 text-[13px]" />}
        </div>
      </Row>
      <Row title="تذكير قراءة القرآن" description="تذكير يومي يفتح المصحف في الوقت الذي تحدده.">
        <div className="flex flex-col items-end gap-2">
          <Toggle checked={quranReminder} onChange={() => void guarded(APP_SETTINGS_KEYS.quranReminder,setQuranReminder,quranReminder)} label="قراءة القرآن"/>
          {quranReminder && <input aria-label="وقت تذكير قراءة القرآن" type="time" value={quranReminderTime} onChange={(event) => { const value=event.target.value; if (!value) return; setQuranReminderTime(value); writeSetting(APP_SETTINGS_KEYS.quranReminderTime,value); emitSettingsChanged() }} className="min-w-[7rem] rounded-xl border border-azkar-gold-soft bg-azkar-card px-3 py-2 text-[13px]" />}
        </div>
      </Row>
      <Row title="سورة الكهف يوم الجمعة" description="تذكير أسبوعي يوم الجمعة فقط، ويفتح السورة مباشرة. متوقف افتراضيًا.">
        <div className="flex flex-col items-end gap-2">
          <Toggle checked={kahf} onChange={() => void guarded(APP_SETTINGS_KEYS.kahfReminder,setKahf,kahf)} label="سورة الكهف يوم الجمعة"/>
          {kahf && <input aria-label="وقت تذكير سورة الكهف" type="time" value={kahfTime} onChange={(event) => { const value=event.target.value; if (!value) return; setKahfTime(value); writeSetting(APP_SETTINGS_KEYS.kahfReminderTime,value); emitSettingsChanged() }} className="min-w-[7rem] rounded-xl border border-azkar-gold-soft bg-azkar-card px-3 py-2 text-[13px]" />}
        </div>
      </Row>
      <Row title="أذكار الصباح" description="عند وقت الشروق وفق مواقيت الصلاة المحفوظة">
        <Toggle checked={azkarMorning} onChange={() => void guarded(APP_SETTINGS_KEYS.azkarMorning,setAzkarMorning,azkarMorning)} label="أذكار الصباح"/>
      </Row>
      <Row title="أذكار المساء" description="عند وقت الغروب وفق مواقيت الصلاة المحفوظة" last>
        <Toggle checked={azkarEvening} onChange={() => void guarded(APP_SETTINGS_KEYS.azkarEvening,setAzkarEvening,azkarEvening)} label="أذكار المساء"/>
      </Row>
    </Section>
    {native && <NotificationDiagnostics />}
    </>
  )
}
