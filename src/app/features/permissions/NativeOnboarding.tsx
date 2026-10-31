import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { readSetting, writeSetting } from '../../settings'
import { scheduleNativeNotifications, checkExactAlarm, openExactAlarmSettings } from '../notifications/nativeNotifications'

const ONBOARDING_DONE_KEY = 'azkar_native_onboarding_v1'

// First-run permission flow inside the APK. It asks ONLY for notification
// permission (and promotes exact alarms on Android 12+), then triggers native
// scheduling.
//
// Location is deliberately NOT requested here: nothing at first launch may pop
// the OS location dialog. The app asks for it later, contextually, when the
// user actually uses a feature that needs it — the «تحديد موقعي» button on the
// prayer-times screen or the location card in settings. That call goes through
// acquireLocation(), whose Geolocation.requestPermissions() now shows the REAL
// system dialog because the app manifest declares the location permissions
// (see scripts/patch-android.mjs).
export function NativeOnboarding() {
  const [visible, setVisible] = useState(false)
  const [notifState, setNotifState] = useState<'unknown' | 'granted' | 'denied'>('unknown')
  const [busy, setBusy] = useState('')
  // Exact alarms: 'granted' (or auto-granted on Android 13+) needs no step.
  // Widened to a plain string so the narrowed JSX branches still compare safely.
  const [exactState, setExactState] = useState<string>('unknown')

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (readSetting(ONBOARDING_DONE_KEY, '0') === '1') return
    void LocalNotifications.checkPermissions()
      .then((s) => setNotifState(s.display === 'granted' ? 'granted' : 'unknown'))
      .catch((error) => console.error('[onboarding] notification check failed', error))
    void checkExactAlarm().then((state) => setExactState(state === 'granted' ? 'granted' : state === 'unknown' ? 'unknown' : 'needed'))
    setVisible(true)
  }, [])

  if (!visible) return null

  // Derived booleans keep the JSX free of narrowed literal comparisons.
  const exactNeeded = exactState === 'needed'
  const exactGranted = exactState === 'granted'

  const askNotifications = async () => {
    setBusy('notif')
    try {
      const res = await LocalNotifications.requestPermissions()
      const granted = res.display === 'granted'
      setNotifState(granted ? 'granted' : 'denied')
      if (granted) {
        // With notifications allowed, promote exact alarms right away: without
        // them Android defers alarms in Doze and the adhan arrives late.
        const state = await checkExactAlarm()
        setExactState(state === 'granted' ? 'granted' : state === 'unknown' ? 'unknown' : 'needed')
      }
    } catch {
      setNotifState('denied')
    }
    setBusy('')
  }

  const askExactAlarms = async () => {
    setBusy('exact')
    try {
      const state = await openExactAlarmSettings()
      setExactState(state === 'granted' ? 'granted' : state === 'unknown' ? 'unknown' : 'needed')
    } catch {
      setExactState('needed')
    }
    setBusy('')
  }

  const finish = () => {
    // Marked done only after the notification request was answered (granted or
    // denied); skipping leaves the flow to appear again on the next launch.
    if (notifState !== 'unknown') writeSetting(ONBOARDING_DONE_KEY, '1')
    setVisible(false)
    // Schedule immediately so notifications work from this very first session.
    void scheduleNativeNotifications()
  }

  const label = (state: string) =>
    state === 'granted' ? 'تم' : state === 'denied' ? 'مرفوض' : ''

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="إعداد التطبيق"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-5"
    >
      <div className="azkar-card w-full max-w-md rounded-3xl border border-azkar-gold-soft p-6 shadow-2xl" dir="rtl">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="font-amiri text-2xl font-bold text-azkar-teal-ink">أهلًا بك في مسلم</div>
          <p className="text-xs text-azkar-ink-soft">خطوات بسيطة لتعمل كل مزايا التطبيق بدقة:</p>
        </div>
        <div className="mt-5 flex flex-col gap-4">
          <div className="rounded-2xl border border-azkar-gold-soft p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold">إشعارات المواقيت والتذكيرات</div>
                <div className="text-[10px] text-azkar-ink-soft">الأذان وآية اليوم وتذكير القرآن والأذكار.</div>
              </div>
              <button
                type="button"
                onClick={() => void askNotifications()}
                disabled={busy === 'notif' || notifState === 'granted'}
                className="shrink-0 rounded-xl bg-azkar-teal px-3 py-2 text-[10px] font-bold text-azkar-card disabled:opacity-60"
              >
                {busy === 'notif' ? '...' : notifState === 'granted' ? 'مسموح' : 'السماح'}
              </button>
            </div>
            {label(notifState) && <div className="mt-1 text-[9px] text-azkar-ink-soft">{label(notifState)}</div>}
          </div>
          {exactNeeded && (
            <div className="rounded-2xl border border-azkar-gold-soft p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold">تنبيهات في وقتها بالضبط</div>
                  <div className="text-[10px] text-azkar-ink-soft">
                    اسمح بـ«المنبّهات والتذكيرات» من شاشة النظام حتى يؤذن التطبيق في الموعد ولا يتأخر.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void askExactAlarms()}
                  disabled={busy === 'exact' || exactGranted}
                  className="shrink-0 rounded-xl bg-azkar-teal px-3 py-2 text-[10px] font-bold text-azkar-card disabled:opacity-60"
                >
                  {busy === 'exact' ? '...' : exactGranted ? 'مفعّلة' : 'تفعيل'}
                </button>
              </div>
              {exactGranted && <div className="mt-1 text-[9px] text-azkar-ink-soft">تم</div>}
            </div>
          )}
          <p className="rounded-2xl border border-dashed border-azkar-gold-soft p-3 text-center text-[10px] text-azkar-ink-soft">
            موقعك لن يُطلب الآن — سيطلبه التطبيق من الهاتف عند أول استخدام لمواقيت الصلاة أو القبلة.
          </p>
        </div>
        <button
          type="button"
          onClick={finish}
          className="mt-6 w-full rounded-xl bg-azkar-teal px-4 py-3 text-sm font-bold text-azkar-card"
        >
          ابدأ الاستخدام
        </button>
      </div>
    </div>
  )
}
