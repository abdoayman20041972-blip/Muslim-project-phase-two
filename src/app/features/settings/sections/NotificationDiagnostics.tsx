import { useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
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
import { openSystemSettings } from '../../permissions/systemSettings'

const PERMISSION_LABELS: Record<string, string> = {
  granted: 'مسموح',
  denied: 'مرفوض',
  prompt: 'لم يُطلب بعد',
  unknown: 'غير معروف',
}

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
    }
  }, [])

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
      <Row title="توفير البطارية" description="إن تأخرت الإشعارات فاسمح للتطبيق بالعمل دون قيود البطارية.">
        <button type="button" className="shrink-0 rounded-xl border border-azkar-gold-soft px-3 py-2 text-[10px] font-bold text-azkar-teal-ink" onClick={() => void openSystemSettings('battery')}>
          فتح الإعدادات
        </button>
      </Row>
      <Row title="آخر جدولة" description={formatTime(diag.ranAt)}>
        <span className="text-[11px] font-bold text-azkar-ink">{toArabicNumber(diag.scheduled)}</span>
      </Row>
      <Row title="إذن الإشعارات" description={'المنبّه الدقيق: ' + (PERMISSION_LABELS[diag.exactAlarm] ?? diag.exactAlarm)}>
        <span className="text-[11px] font-bold text-azkar-ink">{PERMISSION_LABELS[diag.permission] ?? diag.permission}</span>
      </Row>
      <Row
        title="المجدول فعليًا في النظام"
        description={
          diag.timingsMissingDays > 0
            ? 'تعذّر حساب مواقيت ' + toArabicNumber(diag.timingsMissingDays) + ' أيام، وستُعاد المحاولة'
            : undefined
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
          onClick={() => void run('schedule', () => scheduleNativeNotifications({ force: true }))}
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
              setMessage(ok ? 'سيصلك إشعار تجريبي بعد ١٠ ثوانٍ. أغلق التطبيق للتأكد.' : 'تعذّر جدولة الإشعار التجريبي.')
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
