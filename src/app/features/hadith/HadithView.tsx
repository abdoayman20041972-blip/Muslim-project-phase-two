import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Search, Sparkles, X } from 'lucide-react'
import {
  API_EDITIONS,
  HADITH_COLLECTION,
  loadApiEdition,
  type ApiHadith,
} from './hadithData'
import { readSetting } from '../../settings'

type Tab = 'curated' | 'nawawi' | 'qudsi' | 'dehlawi'

function editionOf(tab: Tab) {
  return API_EDITIONS.find((entry) => entry.key === tab)
}

export function HadithView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('curated')
  const [query, setQuery] = useState('')
  const [apiState, setApiState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [apiHadiths, setApiHadiths] = useState<ApiHadith[]>([])
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [font, setFont] = useState(() => readSetting('hadith_font', 'md'))
  const [showNote, setShowNote] = useState(() => readSetting('azkar_hadith_show_note', '1') !== '0')

  useEffect(() => {
    const refresh = () => {
      setFont(readSetting('hadith_font', 'md'))
      setShowNote(readSetting('azkar_hadith_show_note', '1') !== '0')
    }
    window.addEventListener('azkar-settings-changed', refresh)
    return () => window.removeEventListener('azkar-settings-changed', refresh)
  }, [])

  const fontClass = font === 'sm' ? 'text-[13px]' : font === 'lg' ? 'text-[19px]' : 'text-[16px]'

  const activeEdition = editionOf(tab)

  const activeEditionId = activeEdition?.edition
  useEffect(() => {
    if (!activeEditionId) return
    let cancelled = false
    setApiState('loading')
    setError('')
    setApiHadiths([])
    loadApiEdition(activeEditionId)
      .then((data) => {
        if (cancelled) return
        setApiHadiths(data.hadiths)
        setApiState('ready')
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        console.error('[hadith] could not load edition', activeEditionId, cause)
        setError(cause instanceof Error ? cause.message : 'تعذّر الاتصال بالشبكة')
        setApiState('error')
      })
    return () => {
      cancelled = true
    }
  }, [activeEditionId, attempt])

  const curated = useMemo(() => {
    const clean = query.trim()
    if (!clean) return HADITH_COLLECTION
    return HADITH_COLLECTION.filter(
      (hadith) => hadith.text.includes(clean) || hadith.source.includes(clean) || hadith.note.includes(clean),
    )
  }, [query])

  const apiFiltered = useMemo(() => {
    const clean = query.trim()
    if (!clean) return apiHadiths
    return apiHadiths.filter((hadith) => String(hadith.text).includes(clean))
  }, [query, apiHadiths])

  return (
    <section dir="rtl" className="hadith-screen">
      <header className="hadith-header">
        <button type="button" onClick={onBack} aria-label="رجوع" className="u-pressable hadith-icon-button">←</button>
        <div className="min-w-0 flex-1">
          <h1 className="font-amiri text-2xl font-bold text-azkar-teal-ink">الأحاديث</h1>
          <p className="mt-0.5 text-[10px] text-azkar-ink-faint">من النبي ﷺ: كلماتٌ تُصلح القلب والعمل</p>
        </div>
        <span className="hadith-mark" aria-hidden="true"><Sparkles className="h-4 w-4" /></span>
      </header>

      <div className="hadith-tabs" role="tablist" aria-label="تصنيف الأحاديث">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'curated'}
          className={`u-pressable hadith-tab ${tab === 'curated' ? 'is-active' : ''}`}
          onClick={() => setTab('curated')}
        >
          مختارات
        </button>
        {API_EDITIONS.map((edition) => (
          <button
            key={edition.key}
            type="button"
            role="tab"
            aria-selected={tab === edition.key}
            className={`u-pressable hadith-tab ${tab === edition.key ? 'is-active' : ''}`}
            onClick={() => setTab(edition.key as Tab)}
          >
            {edition.name}
          </button>
        ))}
      </div>

      <div className="hadith-search-wrap">
        <Search className="h-4 w-4 shrink-0 text-azkar-ink-faint" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="البحث في الأحاديث"
          placeholder="ابحث في نص الحديث أو المصدر..."
          className="min-w-0 flex-1 bg-transparent text-xs text-azkar-ink outline-none placeholder:text-azkar-ink-faint"
        />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث" className="u-pressable text-azkar-ink-faint"><X className="h-4 w-4" /></button>}
      </div>

      {tab === 'curated' ? (
        <div className="grid gap-3">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="font-amiri text-base font-bold text-azkar-teal-ink">مختارات يعمل دون إنترنت</span>
            <span className="text-[9px] text-azkar-ink-faint">{curated.length} حديثًا</span>
          </div>
          {curated.map((hadith) => (
            <article key={hadith.id} className="hadith-card">
              <div className="hadith-card-top">
                <span>حديث مختار</span>
                <span className="hadith-source">{hadith.source}</span>
              </div>
              <p className={"hadith-text font-amiri " + fontClass}>«{hadith.text}»</p>
              {showNote && <p className="mt-2 border-t border-azkar-hairline pt-2 text-[11px] leading-relaxed text-azkar-ink-soft">{hadith.note}</p>}
            </article>
          ))}
          {!curated.length && (
            <div className="rounded-[var(--r-lg)] border border-azkar-hairline bg-azkar-card px-5 py-10 text-center text-xs text-azkar-ink-soft">
              لا يوجد حديث يطابق بحثك.
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3" data-state={apiState} aria-busy={apiState === 'loading'}>
          {activeEdition && (
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="font-amiri text-base font-bold text-azkar-teal-ink">{activeEdition.name}</span>
              <span className="text-[9px] text-azkar-ink-faint">
                {apiState === 'ready' ? `${apiFiltered.length} حديثًا · متاح بدون إنترنت` : 'من مكتبة مفتوحة'}
              </span>
            </div>
          )}
          {activeEdition && <p className="px-1 pb-1 text-[11px] leading-relaxed text-azkar-ink-soft">{activeEdition.blurb}</p>}
          {apiState === 'loading' && (
            <div className="rounded-[var(--r-lg)] border border-azkar-hairline bg-azkar-card px-5 py-10 text-center text-xs text-azkar-ink-soft">
              جارٍ التحميل من المكتبة المفتوحة...
            </div>
          )}
          {apiState === 'error' && (
            <div className="rounded-[var(--r-lg)] border border-azkar-hairline bg-azkar-card px-5 py-8 text-center">
              <BookOpen className="mx-auto mb-2 h-5 w-5 text-azkar-gold-deep" aria-hidden="true" />
              <p className="text-xs text-azkar-ink-soft">{error || 'تعذّر الاتصال بالشبكة'}</p>
              <p className="mt-1 text-[10px] text-azkar-ink-faint">المختارات أعلاه تعمل دون إنترنت.</p>
              <button
                type="button"
                className="u-pressable mt-3 rounded-full border border-azkar-teal/20 px-4 py-1.5 text-[11px] font-bold text-azkar-teal-ink"
                onClick={() => setAttempt((n) => n + 1)}
              >
                إعادة المحاولة
              </button>
            </div>
          )}
          {apiState === 'ready' && apiFiltered.map((hadith) => (
            <article key={String(hadith.hadithnumber)} className="hadith-card">
              <div className="hadith-card-top">
                <span>حديث {hadith.hadithnumber}</span>
                <span className="hadith-source">{activeEdition?.name}</span>
              </div>
              <p className={"hadith-text font-amiri " + fontClass}>{hadith.text}</p>
            </article>
          ))}
          {apiState === 'ready' && !apiFiltered.length && (
            <div className="rounded-[var(--r-lg)] border border-azkar-hairline bg-azkar-card px-5 py-10 text-center text-xs text-azkar-ink-soft">
              لا يوجد حديث يطابق بحثك.
            </div>
          )}
        </div>
      )}
    </section>
  )
}
