import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'

export function ErrorBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const message = error instanceof Error ? error.message : undefined
  return (
    <div dir="rtl" lang="ar" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center font-['Cairo',sans-serif] text-azkar-ink">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-azkar-gold-tint text-2xl" aria-hidden="true">!</div>
      <h1 className="font-amiri text-3xl font-bold text-azkar-teal-ink">حدث خطأ غير متوقع</h1>
      <p className="max-w-md text-sm leading-6 text-azkar-ink-soft">تعذر تحميل هذه الشاشة. يمكنك المحاولة مرة أخرى.</p>
      {import.meta.env.DEV && message && <details className="max-w-md text-xs text-azkar-ink-faint"><summary>تفاصيل الخطأ (للتطوير)</summary><p className="mt-2 break-words">{message}</p></details>}
      <button type="button" onClick={() => router.invalidate()} className="u-pressable rounded-xl bg-azkar-teal px-5 py-2.5 text-sm font-bold text-azkar-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold">إعادة المحاولة</button>
    </div>
  )
}
