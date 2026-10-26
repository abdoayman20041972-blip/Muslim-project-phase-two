import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { LocalNotifications } from '@capacitor/local-notifications'
import { APP_SETTINGS_KEYS, readSetting, writeSetting } from '../../settings'
import { normalizeCoords } from '../location/coords'
import { scheduleNativeNotifications } from '../notifications/nativeNotifications'

const ONBOARDING_DONE_KEY = 'azkar_native_onboarding_v1'

// First-run permission flow inside the APK: asks for notification and
// location permission once, stores the prayer coordinates, then triggers
// native scheduling. Before this, no permission was ever requested unless
// the user opened the right settings page manually.
export function NativeOnboarding() {
  const [visible, setVisible] = useState(false)
  const [notifState, setNotifState] = useState<'unknown' | 'granted' | 'denied'>('unknown')
  const [locState, setLocState] = useState<'unknown' | 'granted' | 'denied'>('unknown')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (readSetting(ONBOARDING_DONE_KEY, '0') === '1') return
    void LocalNotifications.checkPermissions()
      .then((s) => setNotifState(s.display === 'granted' ? 'granted' : 'unknown'))
      .catch((error) => console.error('[onboarding] notification check failed', error))
    void Geolocation.checkPermissions()
      .then((s) => setLocState(s.location === 'granted' || s.coarseLocation === 'granted' ? 'granted' : 'unknown'))
      .catch((error) => console.error('[onboarding] location check failed', error))
    setVisible(true)
  }, [])

  if (!visible) return null

  const askNotifications = async () => {
    setBusy('notif')
    try {
      const res = await LocalNotifications.requestPermissions()
      setNotifState(res.display === 'granted' ? 'granted' : 'denied')
    } catch {
      setNotifState('denied')
    }
    setBusy('')
  }

  const askLocation = async () => {
    setBusy('loc')
    try {
      const perm = await Geolocation.requestPermissions()
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
        setLocState('denied')
        setBusy('')
        return
      }
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000 })
      const coords = normalizeCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
      if (coords) {
        writeSetting(APP_SETTINGS_KEYS.coords, JSON.stringify(coords))
        writeSetting(APP_SETTINGS_KEYS.prayerLocationUpdatedAt, new Date().toISOString())
        window.dispatchEvent(new CustomEvent('azkar-prayer-settings-changed'))
        setLocState('granted')
      } else {
        setLocState('denied')
      }
    } catch {
      setLocState('denied')
    }
    setBusy('')
  }

  const finish = () => {
    // Marked done only after both requests were answered (granted or denied);
    // skipping leaves the flow to appear again on the next launch.
    if (notifState !== 'unknown' && locState !== 'unknown') writeSetting(ONBOARDING_DONE_KEY, '1')
    setVisible(false)
    // Schedule immediately so notifications work from this very first session.
    void scheduleNativeNotifications()
  }

  const label = (state: typeof notifState) =>
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
          <p className="text-xs text-azkar-ink-soft">خطوتان بسيطتان لتعمل كل مزايا التطبيق:</p>
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
          <div className="rounded-2xl border border-azkar-gold-soft p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold">موقعك لمواقيت الصلاة</div>
                <div className="text-[10px] text-azkar-ink-soft">لحساب المواقيت والقبلة تلقائيًا.</div>
              </div>
              <button
                type="button"
                onClick={() => void askLocation()}
                disabled={busy === 'loc' || locState === 'granted'}
                className="shrink-0 rounded-xl bg-azkar-teal px-3 py-2 text-[10px] font-bold text-azkar-card disabled:opacity-60"
              >
                {busy === 'loc' ? '...' : locState === 'granted' ? 'تم' : 'تحديد موقعي'}
              </button>
            </div>
            {label(locState) && <div className="mt-1 text-[9px] text-azkar-ink-soft">{label(locState)}</div>}
          </div>
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
