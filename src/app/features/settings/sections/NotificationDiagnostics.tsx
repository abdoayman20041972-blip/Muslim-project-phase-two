import { useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { ExactAlarms, type FireLogItem, type NativeStatus } from '@muslim/exact-alarms'
import { fireResultLabel, isFailure, lateSeconds, nativeWarnings, recentFireLog } from '../../notifications/fireLog'
import { toArabicNumber } from '../../../constants'
import {
  checkExactAlarm,
  listScheduledNotifications,
  openExactAlarmSettings,
  scheduleNativeNotifications,
  scheduleTestNotification,
  type ScheduledItem,
} from '../../notifications/nativeNotifications'
import { patchDiagnostics, readDiagnostics } from '../../notifications/nativeDiagnostics'
import { Row, Section } from '../settingsPrimitives'
import { permissionLabel } from '../../notifications/notificationPermission'
import { openSystemSettings } from '../../permissions/systemSettings'

const formatTime = (iso: string | null) => {
  if (!iso) return '—'
  if (iso === 'daily') return 'يوميًا'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
}

const buttonClass =
  'rounded-xl border border-azkar-gold-soft px-3 py-2 text-[11px] font-bold text-azkar-teal-ink disabled:opacity-60'

// Native-only card that shows what the last scheduling run really did, so a
// missing notification can be explained instead of failing silently.
export function NotificationDiagnostics() {
  const [diag, setDiag] = useState(readDiagnostics)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [items, setItems] = useState<ScheduledItem[] | null>(null)
  const [status, setStatus] = useState<NativeStatus | null>(null)
  const [fireLog, setFireLog] = useState<FireLogItem[] | null>(null)

  const loadNative = useCallback(async () => {
    try {
      setStatus(await ExactAlarms.status())
      setFireLog((await ExactAlarms.fireLog()).items)
    } catch (error) {
      console.error('[notifications] native status unavailable', error)
    }
  }, [])

  useEffect(() => {
    void loadNative()
  }, [loadNative])

  useEffect(() => {
    const refresh = () => setDiag(readDiagnostics())
    window.addEventListener('muslim-notification-diagnostics', refresh)
    return () => window.removeEventListener('muslim-notification-diagnostics', refresh)
  }, [])

  useEffect(() => {
    let cancelled = false
    void checkExactAlarm().then((state) => {
      if (cancelled) return
      patchDiagnostics({ exactAlarm: state })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const run = useCallback(async (key: string, action: () => Promise<void>) => {
    setBusy(key)
    setMessage('')
    try {
      await action()
    } finally {
      setBusy('')
      setDiag(readDiagnostics())
      void loadNative()
    }
  }, [loadNative])

  if (!Capacitor.isNativePlatform()) return null

  return (
    <Section title="فحص الإشعارات">
      {diag.exactAlarm !== 'granted' && diag.exactAlarm !== 'unknown' && (
        <Row title="المنبّهات الدقيقة غير مفعّلة" description="قد يتأخر الأذان والتذكيرات عن وقتها. فعّلها من إعدادات النظام.">
          <button
            type="button"
            className="shrink-0 rounded-xl bg-azkar-teal px-3 py-2 text-[10px] font-bold text-azkar-card"
            onClick={() =>
              void run('exact', async () => {
                await openExactAlarmSettings()
                patchDiagnostics({ exactAlarm: await checkExactAlarm() })
              })
            }
          >
            تفعيل
          </button>
        </Row>
      )}
      {diag.locationMissing && (
        <Row title="الموقع غير محدد" description="حدّد موقعك من صفحة مواقيت الصلاة ليعمل الأذان والتذكيرات المرتبطة بالصلاة.">
          <span className="text-[11px] font-bold text-azkar-ink">!</span>
        </Row>
      )}
      {nativeWarnings(status)
        .filter((warning) => warning.key !== 'battery')
        .map((warning) => (
          <Row key={warning.key} title={warning.title} description={warning.description}>
            <span className="text-[11px] font-bold text-azkar-ink">!</span>
          </Row>
        ))}
      <Row
        title="توفير البطارية"
        description={
          status
            ? status.ignoringBatteryOptimizations
              ? 'مسموح للتطبيق بالعمل دون قيود البطارية.'
              : 'التطبيق خاضع لتحسين البطارية. إن تأخرت الإشعارات أو غابت فاسمح له بالعمل دون قيود.'
            : 'إن تأخرت الإشعارات فاسمح للتطبيق بالعمل دون قيود البطارية.'
        }
      >
        <button type="button" className="shrink-0 rounded-xl border border-azkar-gold-soft px-3 py-2 text-[10px] font-bold text-azkar-teal-ink" onClick={() => void openSystemSettings('battery')}>
          فتح الإعدادات
        </button>
      </Row>
      <Row title="آخر جدولة" description={formatTime(diag.ranAt)}>
        <span className="text-[11px] font-bold text-azkar-ink">{toArabicNumber(diag.scheduled)}</span>
      </Row>
      {diag.testScheduledAt && (
        <Row
          title="آخر إشعار تجريبي"
          description={
            diag.testFallbackUsed
              ? 'سلّمه المسار الاحتياطي وليس المنبّه الأصلي — راجع توفير البطارية والمنبّهات الدقيقة'
              : 'مجدول عبر المنبّه الأصلي للنظام'
          }
        >
          <span className="text-[11px] font-bold text-azkar-ink">{formatTime(diag.testScheduledAt)}</span>
        </Row>
      )}
      <Row title="إذن الإشعارات" description={'المنبّه الدقيق: ' + permissionLabel(diag.exactAlarm)}>
        <span className="text-[11px] font-bold text-azkar-ink">{permissionLabel(diag.permission)}</span>
      </Row>
      <Row
        title="خطة التنبيهات المحفوظة"
        description={
          (diag.timingsMissingDays > 0
            ? 'تعذّر حساب مواقيت ' + toArabicNumber(diag.timingsMissingDays) + ' أيام، وستُعاد المحاولة. '
            : '') +
          (diag.armed === null || diag.armed < 0
            ? 'خطة ثلاثين يوماً محفوظة في النظام'
            : 'خطة ثلاثين يوماً، منها ' + toArabicNumber(diag.armed) + ' منبّهاً مسلّحاً خلال ٤٨ ساعة (الباقي يُسلّح تلقائياً)')
        }
      >
        <span className="text-[11px] font-bold text-azkar-ink">{diag.pending === null ? '—' : toArabicNumber(diag.pending)}</span>
      </Row>
      {diag.lastError && <Row title="آخر خطأ" description={diag.lastError + ' (' + formatTime(diag.lastErrorAt) + ')'}><span /></Row>}
      <div className="flex flex-wrap gap-2 border-t border-azkar-gold-soft/50 px-4 py-3">
        <button
          type="button"
          className={buttonClass}
          disabled={busy !== ''}
          onClick={() => void run('schedule', () => scheduleNativeNotifications({ force: true, askPermission: true }))}
        >
          جدولة الآن
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={busy !== ''}
          onClick={() =>
            void run('test', async () => {
              const ok = await scheduleTestNotification()
              setMessage(
                ok
                  ? 'سيصلك إشعار تجريبي بعد ١٠ ثوانٍ كإشعار عائم مع صوت حتى وأنت داخل التطبيق. إن لم يظهر فافحص وضع «عدم الإزعاج» وسماحية الإشعارات من إعدادات النظام.'
                  : 'تعذّر جدولة الإشعار التجريبي — تأكد من السماح للإشعارات من إعدادات النظام ثم أعد المحاولة.',
              )
            })
          }
        >
          إشعار تجريبي بعد ١٠ ثوانٍ
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={busy !== ''}
          onClick={() => void run('list', async () => setItems(await listScheduledNotifications()))}
        >
          عرض المجدول
        </button>
      </div>
      <div className="border-t border-azkar-gold-soft/50 px-4 py-3 text-[10px] text-azkar-ink-soft">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-bold text-azkar-ink">سجل التسليم (آخر ما فعله النظام)</span>
          {fireLog && fireLog.length > 0 && (
            <button
              type="button"
              className="text-[10px] font-bold text-azkar-teal-ink"
              onClick={() => void run('clear-log', async () => { await ExactAlarms.clearFireLog() })}
            >
              مسح
            </button>
          )}
        </div>
        {!fireLog || fireLog.length === 0 ? (
          <div>لا يوجد شيء مسجّل بعد. يُسجَّل كل تنبيه يرنّ بعد هذا التحديث.</div>
        ) : (
          recentFireLog(fireLog).map((item) => {
            const late = lateSeconds(item)
            return (
              <div key={item.at + ':' + item.id + ':' + item.result} className="flex justify-between gap-2 py-0.5">
                <span className={isFailure(item) ? 'font-bold text-azkar-ink' : ''}>
                  {(item.title ? item.title + ': ' : '') + fireResultLabel(item.result)}
                  {late !== null && late > 60 ? ' (تأخر ' + toArabicNumber(Math.round(late / 60)) + ' د)' : ''}
                </span>
                <span className="shrink-0">{formatTime(new Date(item.at).toISOString())}</span>
              </div>
            )
          })
        )}
      </div>
      {message && <div className="px-4 pb-3 text-[10px] text-azkar-ink-soft">{message}</div>}
      {items && (
        <div className="max-h-56 overflow-y-auto border-t border-azkar-gold-soft/50 px-4 py-3 text-[10px] text-azkar-ink-soft">
          {items.length === 0 ? (
            <div>لا توجد إشعارات مجدولة.</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex justify-between gap-2 py-0.5">
                <span className="truncate">{item.title}</span>
                <span className="shrink-0">{formatTime(item.at)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </Section>
  )
}
