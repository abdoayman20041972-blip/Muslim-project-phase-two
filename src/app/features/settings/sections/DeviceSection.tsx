import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { openSystemSettings } from '../../permissions/systemSettings'
import { Geolocation } from '@capacitor/geolocation'
import { acquireLocation, isLocationPermissionGranted, locationFailureMessage } from '../../location/acquireLocation'
import { saveCoords } from '../../location/coords'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Row, Section } from '../settingsPrimitives'

// Device permissions: lets the user review and re-request the native
// permissions the app depends on (notifications, location, motion/compass).
export function DeviceSection() {
  const [notifState, setNotifState] = useState<string>('')
  const [locState, setLocState] = useState<string>('')
  const [locMessage, setLocMessage] = useState('')
  const [busy, setBusy] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          setNotifState((await LocalNotifications.checkPermissions()).display)
        } catch {
          setNotifState('unknown')
        }
        try {
          {
          const permission = await Geolocation.checkPermissions()
          setLocState(isLocationPermissionGranted(permission) ? 'granted' : permission.location)
        }
        } catch {
          setLocState('unknown')
        }
      } else {
        setNotifState(typeof Notification !== 'undefined' ? Notification.permission : 'unknown')
        setLocState('geolocation' in navigator ? 'prompt' : 'unavailable')
      }
    }
    void load()
  }, [])

  const askLocation = async () => {
    setBusy('loc')
    setLocMessage('')
    const result = await acquireLocation()
    if (result.ok) {
      saveCoords(result.coords)
      setLocState('granted')
    } else {
      if (result.reason === 'permission-denied') setLocState('denied')
      setLocMessage(locationFailureMessage(result.reason))
    }
    setBusy('')
  }

  const label = (state: string) =>
    state === 'granted' ? 'مسموح' : state === 'denied' ? 'مرفوض' : state === 'prompt' ? 'لم يُطلب بعد' : state || '...'

  return (
    <Section title="الأذونات والجهاز">
      <Row title="إشعارات التطبيق" description="لتنبيهات الصلاة والأذكار والتنبيهات اليومية.">
        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] text-azkar-ink-soft">{label(notifState)}</span>
          {notifState !== 'granted' && (
            <span className="max-w-[9rem] text-left text-[9px] text-azkar-ink-soft">يُطلب ويُدار من «الإشعارات»</span>
          )}
        </div>
      </Row>
      <Row title="الموقع" description="لحساب مواقيت الصلاة واتجاه القبلة تلقائيًا.">
        <div className="flex flex-col items-end gap-1">
          <span className="max-w-[12rem] text-left text-[9px] text-azkar-ink-soft">{locMessage || label(locState)}</span>
          {locState !== 'granted' && (
            <button onClick={() => void askLocation()} disabled={busy === 'loc'} className="rounded-xl bg-azkar-teal px-3 py-2 text-[10px] font-bold text-azkar-card disabled:opacity-60">
              {busy === 'loc' ? '...' : 'طلب الإذن'}
            </button>
          )}
          {locState === 'denied' && Capacitor.isNativePlatform() && (
            <button onClick={() => void openSystemSettings('app')} className="rounded-xl border border-azkar-gold-soft px-3 py-2 text-[10px] font-bold text-azkar-teal-ink">
              فتح إعدادات النظام
            </button>
          )}
        </div>
      </Row>
      <Row title="الحركة والبوصلة" description="يُطلب تلقائيًا عند فتح صفحة القبلة لتدوير المؤشر مع الجهاز." last>
        <span className="text-[9px] text-azkar-ink-soft">
          {Capacitor.isNativePlatform() ? 'مدمج في التطبيق' : 'يعمل في المتصفح'}
        </span>
      </Row>
    </Section>
  )
}
