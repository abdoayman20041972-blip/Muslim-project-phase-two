import { Sparkles } from 'lucide-react'

/**
 * The "More" tab. The tools that used to live here (Tasbih, Settings,
 * Favorites, Prophets, Qibla) all have direct entries on Home now, so the
 * user asked (Telegram 14264090 + voice 14267882, confirmed 14269851) for
 * this page to stay in the bottom bar as an empty placeholder that says
 * «قريبًا» until new sections land here.
 */
export function MoreView() {
  return (
    <div className="w-full min-w-0" data-testid="more-view">
      <h1 className="font-amiri text-[1.75rem] font-bold text-azkar-teal-ink">المزيد</h1>
      <div className="mt-10 flex flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-azkar-hairline bg-azkar-card px-6 py-16 text-center u-shadow-2">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-azkar-gold-tint text-azkar-gold-deep" aria-hidden="true">
          <Sparkles className="h-7 w-7" />
        </span>
        <p className="font-amiri text-[1.625rem] font-bold text-azkar-teal-ink">قريبًا</p>
        <p className="max-w-[16rem] text-[0.8125rem] font-semibold leading-6 text-azkar-ink-soft">نعمل على أقسام جديدة ستظهر هنا في التحديثات القادمة</p>
      </div>
    </div>
  )
}
