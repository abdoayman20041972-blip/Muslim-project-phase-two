import { useMemo, useState } from 'react'
import { copyText, shareText } from './shareActions'
import type { ZikrCategory } from '../../../azkar-data'
import { BackButton } from '../../components/app-chrome'
import { toArabicDigits, toArabicNumber, type View } from '../../constants'
import { itemCount, itemTarget, readAzkarProgress } from './azkarProgress'

type Favorite = { key: string; category: ZikrCategory; item: ZikrCategory['items'][number] }
type Props = { favorites: Favorite[]; onToggleFavorite: (key: string) => void; onBack: () => void; setView?: (view: View) => void }

function StarIcon({ filled = false, className = 'h-[18px] w-[18px]' }: { filled?: boolean; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill={filled ? 'currentColor' : 'none'} aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
}
function CopyIcon() {
  return <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.7"/></svg>
}
function ShareIcon() {
  return <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" aria-hidden="true"><circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.7"/><circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7"/><circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="m8.2 10.8 7.5-4.3M8.2 13.2l7.5 4.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
}

export function FavoritesView({ favorites, onToggleFavorite, onBack, setView }: Props) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [progress] = useState<Record<string, number>>(() => readAzkarProgress())

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>()
    return favorites.reduce<ZikrCategory[]>((result, favorite) => {
      if (!seen.has(favorite.category.id)) {
        seen.add(favorite.category.id)
        result.push(favorite.category)
      }
      return result
    }, [])
  }, [favorites])

  const normalizedSearch = search.trim().toLocaleLowerCase('ar')
  const visibleFavorites = useMemo(() => favorites.filter(({ category, item }) => {
    const matchesSearch = !normalizedSearch || item.text.toLocaleLowerCase('ar').includes(normalizedSearch)
    const matchesCategory = categoryFilter === 'all' || category.id === categoryFilter
    return matchesSearch && matchesCategory
  }), [favorites, normalizedSearch, categoryFilter])


  return <div className="azkar-favorites-redesign">
    <div className="azkar-favorites-header flex items-center gap-3 mb-2"><BackButton onClick={onBack}/><div className="flex-1"><div className="font-amiri font-bold text-2xl text-azkar-teal-ink">المفضلة</div><div className="text-[11px] text-azkar-ink-faint mt-0.5">{favorites.length ? `${toArabicNumber(favorites.length)} ${favorites.length === 1 ? 'ذكر محفوظ' : 'أذكار محفوظة'}` : 'أذكارك المحفوظة'}</div></div></div>

    {favorites.length === 0
      ? <div className="mt-10 rounded-[var(--r-lg)] border border-azkar-hairline bg-azkar-card px-6 py-10 text-center u-shadow-1">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-azkar-gold-tint text-azkar-gold"><StarIcon className="h-7 w-7"/></div>
          <div className="font-amiri font-bold text-xl text-azkar-ink">لا توجد أذكار محفوظة بعد</div>
          <p className="mt-2 mx-auto max-w-[16rem] text-[12.5px] leading-6 text-azkar-ink-soft">اضغط النجمة بجوار أي ذكر ليظهر هنا لسهولة الرجوع إليه</p>
        </div>
      : <>
          <div className="mt-5 rounded-[var(--r-lg)] border border-azkar-hairline bg-azkar-card p-4 u-shadow-1">
            <label htmlFor="favorites-search" className="mb-2 block text-[11px] font-bold text-azkar-ink">بحث في المفضلة</label>
            <input id="favorites-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث داخل نص الذكر..." className="h-11 w-full rounded-xl border border-azkar-hairline bg-azkar-surface-1 px-3 text-[12px] text-azkar-ink outline-none focus:border-azkar-teal focus:ring-2 focus:ring-azkar-teal/15" />
            <label htmlFor="favorites-category-filter" className="mb-2 mt-3 block text-[11px] font-bold text-azkar-ink">تصفية حسب القسم</label>
            <select id="favorites-category-filter" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="h-11 w-full rounded-xl border border-azkar-hairline bg-azkar-surface-1 px-3 text-[12px] text-azkar-ink outline-none focus:border-azkar-teal focus:ring-2 focus:ring-azkar-teal/15">
              <option value="all">كل الأقسام</option>
              {categoryOptions.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
            <div className="mt-3 text-[10px] text-azkar-ink-faint" role="status">{toArabicNumber(visibleFavorites.length)} نتيجة</div>
          </div>

          <div className="azkar-favorites-list mt-4 divide-y divide-azkar-hairline overflow-hidden rounded-[var(--r-lg)] border border-azkar-hairline bg-azkar-card u-shadow-1">
            {visibleFavorites.length === 0
              ? <div className="px-5 py-10 text-center"><div className="font-amiri text-[18px] font-bold text-azkar-ink">لا توجد نتائج</div><div className="mt-1 text-[10px] text-azkar-ink-faint">جرّب نصًا آخر أو اختر قسمًا مختلفًا.</div></div>
              : visibleFavorites.map(({ key, category, item }) => {
                  const target = itemTarget(item.repeat)
                  const current = itemCount(progress, key, item.repeat)
                  const completed = current >= target
                  return <article key={key} className="relative overflow-hidden px-4 py-5">
                    <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full border border-azkar-teal/10" />
                    <span aria-hidden="true" className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full border border-azkar-gold/10" />
                    <div className="relative mb-3 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-azkar-teal-tint px-2.5 py-1 text-[10.5px] font-bold text-azkar-teal-ink">{category.label}</span>
                      <button onClick={() => onToggleFavorite(key)} aria-label="إزالة من المفضلة" className="u-pressable flex h-8 w-8 items-center justify-center rounded-full text-azkar-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal"><StarIcon filled/></button>
                    </div>
                    <p className="relative u-reading-text text-[19px] text-azkar-ink whitespace-pre-line">{toArabicDigits(item.text)}</p>
                    <div className="relative mt-4 rounded-2xl border border-azkar-hairline bg-azkar-surface-1 p-2.5">
                      <div className="mb-2 flex items-center justify-between px-1">
                        <span className="text-[9px] text-azkar-ink-faint">التقدم</span>
                        <span className="text-[12px] font-bold text-azkar-teal-ink">{toArabicNumber(current)} <span className="text-[9px] text-azkar-ink-faint">من {toArabicNumber(target)}</span></span>
                      </div>
                      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-azkar-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={current} aria-label={`تقدم الذكر: ${current} من ${target}`}>
                        <div className={`h-full rounded-full transition-all duration-200 ${completed ? 'bg-azkar-gold' : 'bg-azkar-teal'}`} style={{ width: `${Math.min(100, current / target * 100)}%` }} />
                      </div>
                    </div>
                    <div className="relative mt-4 flex items-center gap-2 border-t border-azkar-hairline pt-3">
                      <button onClick={() => setView?.({ name: 'category', id: category.id })} aria-label={`فتح ${category.label}`} className="u-pressable flex h-9 items-center gap-2 rounded-full border border-azkar-teal/20 bg-azkar-teal-tint px-3 text-[11px] font-bold text-azkar-teal-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal">فتح في القسم</button>
                      <button onClick={() => void copyText(item.text)} aria-label="نسخ الذكر" className="u-pressable flex h-9 items-center gap-2 rounded-full border border-azkar-hairline bg-azkar-surface-1 px-3 text-[11px] font-bold text-azkar-teal-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal"><CopyIcon/>نسخ</button>
                      <button onClick={() => void shareText(item.text)} aria-label="مشاركة الذكر" className="u-pressable flex h-9 items-center gap-2 rounded-full border border-azkar-hairline bg-azkar-surface-1 px-3 text-[11px] font-bold text-azkar-teal-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal"><ShareIcon/>مشاركة</button>
                    </div>
                  </article>
                })}
          </div>
        </>}
  </div>
}
