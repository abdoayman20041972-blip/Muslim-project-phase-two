import type { FireLogItem, NativeStatus } from '@muslim/exact-alarms'

// Pure helpers that turn the native fire log and status into plain Arabic
// lines for the diagnostics card. No Capacitor access here, so it is testable.

const RESULT_LABELS: Record<string, string> = {
  posted: 'ظهر الإشعار',
  notifications_disabled: 'لم يظهر: الإشعارات معطّلة للتطبيق',
  post_failed: 'لم يظهر: فشل النشر',
  no_entry: 'رنّ المنبّه لكن الخطة المحفوظة لا تحتوي عليه',
  error: 'خطأ غير متوقع',
  boot: 'إعادة تشغيل الجهاز: أُعيد ضبط المنبّهات',
  package_replaced: 'تحديث التطبيق: أُعيد ضبط المنبّهات',
  time_set: 'تغيّر الوقت: بقيت الخطة',
  timezone_event: 'إشارة المنطقة الزمنية: لم يتغير الفرق، بقيت الخطة',
  timezone_changed: 'تغيّرت المنطقة الزمنية: بقيت التذكيرات الثابتة بنفس الساعة المحلية، والمواقيت تنتظر فتح التطبيق',
}

export const FAILURE_RESULTS = ['notifications_disabled', 'post_failed', 'no_entry', 'error'] as const

export function fireResultLabel(result: string): string {
  return RESULT_LABELS[result] ?? result
}

export function isFailure(item: FireLogItem): boolean {
  return (FAILURE_RESULTS as readonly string[]).includes(item.result)
}

/** Newest first, capped, so the card stays short. */
export function recentFireLog(items: FireLogItem[], limit = 12): FireLogItem[] {
  return [...items].sort((a, b) => b.at - a.at).slice(0, limit)
}

/** Seconds between the planned time and the moment the receiver ran; null for non-alarm rows. */
export function lateSeconds(item: FireLogItem): number | null {
  if (!item.planned) return null
  return Math.max(0, Math.round((item.at - item.planned) / 1000))
}

export type NativeWarning = { key: string; title: string; description: string }

/** Plain-language warnings the user can act on, from the native status. */
export function nativeWarnings(status: NativeStatus | null): NativeWarning[] {
  if (!status) return []
  const warnings: NativeWarning[] = []
  if (!status.notificationsEnabled) {
    warnings.push({ key: 'disabled', title: 'الإشعارات معطّلة للتطبيق', description: 'لن يظهر أي تنبيه حتى تسمح بها من إعدادات النظام.' })
  }
  if (status.needsReplan) {
    warnings.push({ key: 'replan', title: 'تغيّرت المنطقة الزمنية', description: 'بقيت التذكيرات ذات الوقت الثابت بنفس الساعة المحلية، لكن مواقيت الصلاة ما زالت محسوبة لموقعك السابق. افتح التطبيق أو اضغط «جدولة الآن» لتحديثها.' })
  }
  if (!status.ignoringBatteryOptimizations) {
    warnings.push({ key: 'battery', title: 'التطبيق خاضع لتحسين البطارية', description: 'بعض الهواتف توقف تنبيهات التطبيقات الخاضعة له. إن تأخرت الإشعارات أو غابت فاسمح للتطبيق بالعمل دون قيود.' })
  }
  return warnings
}
