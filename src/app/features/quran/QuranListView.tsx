import { useMemo } from 'react'
import { surahList } from '../../../quran-meta'
import { toArabicNumber, type View } from '../../constants'
import { BackButton } from '../../components/app-chrome'

type P = {
  lastSurah: number | null
  surahSearch: string
  setSurahSearch: (v: string) => void
  setView: (v: View) => void
}
export function normalizeSurahSearch(v: string) {
  return v
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M6 4.5v15l13-7.5-13-7.5Z" />
    </svg>
  )
}
function ChevronIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} rtl:rotate-180`} fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
/** Eight-point star frame used behind surah numbers, like a printed Mushaf index. */
function StarFrame() {
  return (
    <svg viewBox="0 0 40 40" className="quran-star-frame" aria-hidden="true">
      <rect x="9" y="9" width="22" height="22" rx="2.5" fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.1" />
      <rect x="9" y="9" width="22" height="22" rx="2.5" fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.1" transform="rotate(45 20 20)" />
    </svg>
  )
}
export function QuranListView(p: P) {
  const filtered = useMemo(() => {
    const q = p.surahSearch.trim()
    if (!q) return surahList
    const x = normalizeSurahSearch(q)
    return surahList.filter(
      (s) =>
        normalizeSurahSearch(s.shortName).includes(x) ||
        normalizeSurahSearch(s.name).includes(x) ||
        normalizeSurahSearch(String(s.number)) === x,
    )
  }, [p.surahSearch])
  const last = p.lastSurah ? surahList.find((s) => s.number === p.lastSurah) : undefined
  return (
    <div className="quran-list-redesign">
      <div className="quran-list-header flex items-center gap-3 mb-4">
        <BackButton onClick={() => p.setView({ name: 'home' })} />
        <div className="flex-1">
          <div className="font-amiri font-bold text-2xl text-azkar-teal-ink">المصحف الشريف</div>
          <div className="text-[10px] text-azkar-ink-faint mt-0.5">كتاب الله بين يديك</div>
        </div>
        <span className="quran-header-badge" aria-hidden="true">
          <BookIcon />
        </span>
      </div>
      {last && (
        <button
          onClick={() => p.setView({ name: 'mushaf-surah', number: last.number })}
          className="quran-continue u-pressable"
        >
          <span className="quran-continue-play" aria-hidden="true">
            <PlayIcon />
          </span>
          <span className="flex-1 text-right min-w-0">
            <span className="block text-[10px] opacity-75">متابعة القراءة</span>
            <span className="block font-amiri font-bold text-xl mt-0.5 truncate">سورة {last.shortName}</span>
            <span className="block text-[10px] opacity-70 mt-0.5">
              {last.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · {toArabicNumber(last.numberOfAyahs)} آية
            </span>
          </span>
          <span className="quran-continue-arrow" aria-hidden="true">
            <ChevronIcon />
          </span>
        </button>
      )}
      <div className="quran-search">
        <span className="quran-search-icon">
          <SearchIcon />
        </span>
        <input
          aria-label="البحث عن سورة"
          value={p.surahSearch}
          onChange={(e) => p.setSurahSearch(e.target.value)}
          placeholder="ابحث باسم السورة أو رقمها..."
        />
      </div>
      {filtered.length === 0 ? (
        <div className="quran-index-empty">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-azkar-teal-tint text-azkar-teal-ink">
            <SearchIcon />
          </div>
          <div className="mt-3 font-amiri text-lg font-bold text-azkar-teal-ink">لا توجد سورة مطابقة</div>
          <p className="mt-1 text-[10px] leading-5 text-azkar-ink-soft">جرّب اسم السورة أو رقمها بطريقة أخرى.</p>
        </div>
      ) : (
        <div className="quran-index">
          {filtered.map((s) => (
            <button
              key={s.number}
              onClick={() => p.setView({ name: 'mushaf-surah', number: s.number })}
              className="quran-index-row u-pressable"
            >
              <span className="quran-star">
                <StarFrame />
                <span className="quran-star-number">{toArabicNumber(s.number)}</span>
              </span>
              <span className="flex-1 min-w-0 text-right">
                <span className="block font-amiri font-bold text-[18px] leading-tight">{s.shortName}</span>
                <span className="block text-[10px] text-azkar-ink-soft mt-0.5">
                  {s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · {toArabicNumber(s.numberOfAyahs)} آية
                </span>
              </span>
              <span className="quran-index-arrow" aria-hidden="true">
                <ChevronIcon className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
