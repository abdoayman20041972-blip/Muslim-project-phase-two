import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <div dir="rtl" lang="ar" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center font-['Cairo',sans-serif] text-azkar-ink">
      <div className="font-amiri text-5xl font-bold text-azkar-gold" aria-hidden="true">٤٠٤</div>
      <h1 className="font-amiri text-2xl font-bold text-azkar-teal-ink">الصفحة غير موجودة</h1>
      <p className="text-sm leading-6 text-azkar-ink-soft">يبدو أن الصفحة التي تحاول الوصول إليها غير متاحة.</p>
      <Link to="/" className="u-pressable rounded-xl bg-azkar-teal px-5 py-2.5 text-sm font-bold text-azkar-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold">العودة إلى الرئيسية</Link>
    </div>
  )
}
