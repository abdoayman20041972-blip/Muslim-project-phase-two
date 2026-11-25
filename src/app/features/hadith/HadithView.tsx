import { useEffect, useMemo, useState } from 'react'
import { shareQuoteCard } from '../azkar/shareActions'
import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, Search, Share2, Sparkles, X } from 'lucide-react'
import {
  API_EDITIONS,
  HADITH_COLLECTION,
  loadApiEdition,
  type EditionOrigin,
  type HadithGrade,
} from './hadithData'
import { HADITH_SOURCE_URLS } from './hadithSources'
import { highlightParts, matches } from './hadithSearch'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'
import { toArabicDigits, toArabicNumber } from '../../constants'

type GroupKey = 'curated' | 'nawawi' | 'qudsi' | 'dehlawi'

type Item = {
  key: string
  group: GroupKey
  number: string
  label: string
  text: string
  source?: string
  sourceUrl?: string
  note?: string
  excerpt?: boolean
  grade?: HadithGrade
}

type EditionState = { state: 'loading' | 'ready' | 'error'; items: Item[]; origin: EditionOrigin; error: string }

const GROUPS: { key: GroupKey; name: string; blurb: string }[] = [
  { key: 'curated', name: 'مختارات', blurb: 'أحاديث مختارة بمصدر كل حديث وملاحظة مختصرة، مضمّنة في التطبيق.' },
  ...API_EDITIONS.map((edition) => ({ key: edition.key as GroupKey, name: edition.name, blurb: edition.blurb })),
]

const curatedItems: Item[] = HADITH_COLLECTION.map((hadith, index) => ({
  key: hadith.id,
  group: 'curated',
  number: String(index + 1),
  label: 'حديث مختار',
  text: hadith.text,
  source: hadith.source,
  sourceUrl: HADITH_SOURCE_URLS[hadith.id],
  note: hadith.note,
  excerpt: hadith.excerpt,
  grade: hadith.grade,
}))

function HighlightedText({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightParts(text, query).map((part, i) =>
        part.match ? <mark key={i} className="hadith-mark-hit" data-testid="hadith-hit">{part.text}</mark> : <span key={i}>{part.text}</span>,
      )}
    </>
  )
}

export function HadithView({ onBack }: { onBack: () => void }) {
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null)
  const [index, setIndex] = useState(0)
  const [query, setQuery] = useState('')
  const [editions, setEditions] = useState<Record<string, EditionState>>({})
  const [attempt, setAttempt] = useState(0)
  const [font, setFont] = useState(() => readSetting(APP_SETTINGS_KEYS.hadithFont, 'md'))
  const [showNote, setShowNote] = useState(() => readSetting(APP_SETTINGS_KEYS.hadithShowNote, '1') !== '0')
  const [, setNumberTick] = useState(0)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const refresh = () => {
      setNumberTick((n) => n + 1)
      setFont(readSetting(APP_SETTINGS_KEYS.hadithFont, 'md'))
      setShowNote(readSetting(APP_SETTINGS_KEYS.hadithShowNote, '1') !== '0')
    }
    window.addEventListener('azkar-settings-changed', refresh)
    return () => window.removeEventListener('azkar-settings-changed', refresh)
  }, [])

  const fontSize = font === 'sm' || font === 'lg' ? font : 'md'

  useEffect(() => {
    let cancelled = false
    API_EDITIONS.forEach((edition) => {
      setEditions((prev) => (prev[edition.key]?.state === 'ready' ? prev : { ...prev, [edition.key]: { state: 'loading', items: [], origin: 'bundled', error: '' } }))
      loadApiEdition(edition.edition)
        .then((data) => {
          if (cancelled) return
          const items: Item[] = data.hadiths.map((hadith) => ({
            key: `${edition.key}-${hadith.hadithnumber}`,
            group: edition.key as GroupKey,
            number: String(hadith.hadithnumber),
            label: `حديث ${hadith.hadithnumber}`,
            text: String(hadith.text),
          }))
          setEditions((prev) => ({ ...prev, [edition.key]: { state: 'ready', items, origin: data.origin, error: '' } }))
        })
        .catch((cause: unknown) => {
          if (cancelled) return
          console.error('[hadith] could not load edition', edition.edition, cause)
          const error = cause instanceof Error ? cause.message : 'تعذّر الاتصال بالشبكة'
          setEditions((prev) => ({ ...prev, [edition.key]: { state: 'error', items: [], origin: 'bundled', error } }))
        })
    })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const itemsOf = (key: GroupKey): Item[] => (key === 'curated' ? curatedItems : editions[key]?.items ?? [])
  const countText = (key: GroupKey) => {
    if (key === 'curated') return `${toArabicNumber(curatedItems.length)} حديثًا`
    const edition = editions[key]
    if (!edition || edition.state === 'loading') return 'جارٍ التحميل'
    if (edition.state === 'error') return 'تعذّر التحميل'
    return `${toArabicNumber(edition.items.length)} حديثًا`
  }

  const results = useMemo(() => {
    if (!query.trim()) return []
    return GROUPS.map((group) => ({
      group,
      hits: (group.key === 'curated' ? curatedItems : editions[group.key]?.items ?? []).filter(
        (item) => matches(item.text, query) || (item.source ? matches(item.source, query) : false) || (item.note ? matches(item.note, query) : false),
      ),
    })).filter((entry) => entry.hits.length)
  }, [query, editions])

  const open = (key: GroupKey, at = 0) => {
    setOpenGroup(key)
    setIndex(at)
    setStatus('')
  }

  const searchBox = (
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
  )

  const header = (title: string, subtitle: string, back: () => void) => (
    <header className="hadith-header">
      <button type="button" onClick={back} aria-label="رجوع" className="u-pressable hadith-icon-button">←</button>
      <div className="min-w-0 flex-1">
        <h1 className="font-amiri text-2xl font-bold text-azkar-teal-ink">{title}</h1>
        <p className="mt-0.5 text-[0.6875rem] text-azkar-ink-faint">{subtitle}</p>
      </div>
      <span className="hadith-mark" aria-hidden="true"><Sparkles className="h-4 w-4" /></span>
    </header>
  )

  // ---- Reading screen ----
  if (openGroup) {
    const group = GROUPS.find((entry) => entry.key === openGroup)!
    const edition = openGroup === 'curated' ? null : editions[openGroup]
    const items = itemsOf(openGroup)
    const item = items[Math.min(index, Math.max(items.length - 1, 0))]
    const share = async () => {
      if (!item) return
      await shareQuoteCard({
        text: item.text,
        reference: item.source ? toArabicDigits(item.source) : undefined,
        heading: item.group === 'curated' ? 'حديث شريف' : `حديث ${toArabicDigits(item.number)}`,
        filename: 'hadith.png',
      })
    }
    return (
      <section dir="rtl" className="hadith-screen hadith-reader-screen" data-testid="hadith-reader">
        {header(group.name, edition?.state === 'ready' ? (edition.origin === 'bundled' ? 'من ملف مضمّن، يعمل دون إنترنت' : 'حُمّل من الإنترنت لتعذر الملف المضمّن') : group.blurb, () => setOpenGroup(null))}
        {edition?.state === 'loading' && (
          <div className="hadith-empty" data-testid="hadith-loading">
            <BookOpen className="hadith-empty-icon" aria-hidden="true" />
            <p className="text-xs text-azkar-ink-soft">جارٍ تحميل الأحاديث...</p>
          </div>
        )}
        {edition?.state === 'error' && (
          <div className="hadith-empty">
            <BookOpen className="hadith-empty-icon" aria-hidden="true" />
            <p className="text-xs text-azkar-ink-soft">{edition.error}</p>
            <p className="mt-1 text-[0.6875rem] text-azkar-ink-faint">تبويب «مختارات» مضمّن في التطبيق ويعمل دون إنترنت.</p>
            <button type="button" className="u-pressable mt-3 rounded-full border border-azkar-teal/20 px-4 py-1.5 text-[0.6875rem] font-bold text-azkar-teal-ink" onClick={() => setAttempt((n) => n + 1)}>إعادة المحاولة</button>
          </div>
        )}
        {item && (
          <div className="hadith-reader-body">
            <article key={item.key} className="hadith-card hadith-reader-card">
              <div className="hadith-card-top">
                <span>
                  {item.group === 'curated' ? item.label : `حديث ${toArabicDigits(item.number)}`}
                  {item.excerpt && (
                    <span className="mr-2 rounded-full border border-azkar-hairline px-2 py-0.5 text-[0.6875rem] font-normal text-azkar-ink-soft" title="جزء من الحديث الوارد في المصدر" data-testid="hadith-excerpt-badge">مقتطف</span>
                  )}
                </span>
                {item.source && <span className="hadith-source">{toArabicDigits(item.source)}</span>}
              </div>
              <p className="hadith-text font-amiri" data-size={fontSize}>{item.text}</p>
              {item.grade && (
                <p className="mt-2 text-[0.6875rem] text-azkar-ink-soft" data-testid="hadith-grade">
                  الدرجة: {item.grade.label} · {item.grade.by}{' '}
                  <a href={item.grade.url} target="_blank" rel="noreferrer" className="underline">المصدر</a>
                </p>
              )}
              {item.group === 'curated' && (
                item.sourceUrl ? (
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" data-testid="hadith-source-link" className="u-pressable mt-2 inline-flex min-h-11 items-center gap-1 text-[0.6875rem] font-bold text-azkar-teal-ink">
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> عرض المصدر على sunnah.com
                  </a>
                ) : (
                  <p className="mt-2 text-[0.6875rem] text-azkar-ink-faint" data-testid="hadith-source-pending">رابط المصدر غير معروض: المرجع قيد المراجعة.</p>
                )
              )}
              {showNote && item.note && <p className="mt-2 border-t border-azkar-hairline pt-2 text-[0.6875rem] leading-relaxed text-azkar-ink-soft"><span className="block font-bold">ملاحظة توضيحية</span>{item.note}</p>}
              <div className="mt-3 flex gap-2 border-t border-azkar-hairline pt-3">
                <button type="button" onClick={share} className="u-pressable inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full border border-azkar-teal/20 text-[0.6875rem] font-bold text-azkar-teal-ink"><Share2 className="h-3.5 w-3.5" aria-hidden="true" /> مشاركة</button>
              </div>
              <p role="status" className="mt-1 min-h-4 text-center text-[0.6875rem] text-azkar-ink-faint">{status}</p>
            </article>
            <nav className="hadith-reader-nav" aria-label="التنقل بين الأحاديث">
              <button type="button" onClick={() => { setIndex(index - 1); setStatus('') }} disabled={index <= 0} aria-label="الحديث السابق" className="u-pressable inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-azkar-hairline disabled:opacity-40"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
              <span className="text-[0.6875rem] font-bold text-azkar-ink-soft" data-testid="hadith-position">حديث {toArabicNumber(index + 1)} من {toArabicNumber(items.length)}</span>
              <button type="button" onClick={() => { setIndex(index + 1); setStatus('') }} disabled={index >= items.length - 1} aria-label="الحديث التالي" className="u-pressable inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-azkar-hairline disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
            </nav>
            <div className="hadith-progress" aria-hidden="true"><span style={{ width: `${((index + 1) / items.length) * 100}%` }} /></div>
          </div>
        )}
      </section>
    )
  }

  // ---- Groups + search screen ----
  return (
    <section dir="rtl" className="hadith-screen">
      {header('الأحاديث', 'من النبي ﷺ: كلماتٌ تُصلح القلب والعمل', onBack)}
      {searchBox}
      {query.trim() ? (
        <div className="grid gap-4" data-testid="hadith-results">
          {results.map(({ group, hits }) => (
            <div key={group.key} className="grid gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="font-amiri text-base font-bold text-azkar-teal-ink">{group.name}</span>
                <span className="text-[0.6875rem] text-azkar-ink-faint">{toArabicNumber(hits.length)} نتيجة</span>
              </div>
              {hits.slice(0, 20).map((item) => (
                <button key={item.key} type="button" onClick={() => open(group.key, itemsOf(group.key).findIndex((entry) => entry.key === item.key))} className="hadith-card u-pressable text-right" data-testid="hadith-result">
                  <div className="hadith-card-top"><span>{item.group === 'curated' ? item.label : `حديث ${toArabicDigits(item.number)}`}</span>{item.source && <span className="hadith-source">{toArabicDigits(item.source)}</span>}</div>
                  <p className="hadith-text font-amiri line-clamp-3" data-size={fontSize}><HighlightedText text={item.text} query={query} /></p>
                  {item.note && matches(item.note, query) && !matches(item.text, query) && <p className="mt-2 text-[0.6875rem] text-azkar-ink-soft">ملاحظة: <HighlightedText text={item.note} query={query} /></p>}
                </button>
              ))}
              {hits.length > 20 && <p className="px-1 text-[0.6875rem] text-azkar-ink-faint">يظهر أول {toArabicNumber(20)} نتيجة. دقّق البحث لتضييق النتائج.</p>}
            </div>
          ))}
          {!results.length && (
            <div className="hadith-empty" data-testid="hadith-empty-state">
              <BookOpen className="hadith-empty-icon" aria-hidden="true" />
              <p className="text-xs text-azkar-ink-soft">{API_EDITIONS.some((entry) => !editions[entry.key] || editions[entry.key].state === 'loading') ? 'جارٍ تحميل بقية الأقسام للبحث...' : 'لا يوجد حديث يطابق بحثك. جرّب كلمة أبسط أو بدون تشكيل.'}</p>
            </div>
          )}
          {API_EDITIONS.some((entry) => editions[entry.key]?.state === 'error') && <p role="status" className="hadith-empty">البحث غير مكتمل: تعذّر تحميل بعض الأقسام. <button type="button" onClick={() => setAttempt((n) => n + 1)} className="underline">إعادة المحاولة</button></p>}
        </div>
      ) : (
        <div className="grid gap-3" data-testid="hadith-groups">
          {GROUPS.map((group) => {
            const edition = group.key === 'curated' ? null : editions[group.key]
            return (
              <div key={group.key} className="hadith-card">
                <button type="button" onClick={() => open(group.key)} disabled={edition?.state === 'loading'} className="u-pressable block w-full text-right" data-testid={`hadith-group-${group.key}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-amiri text-lg font-bold text-azkar-teal-ink">{group.name}</span>
                    <span className="text-[0.6875rem] font-bold text-azkar-gold-deep" data-testid={`hadith-count-${group.key}`}>{countText(group.key)}</span>
                  </div>
                  <p className="mt-1 text-[0.6875rem] leading-relaxed text-azkar-ink-soft">{group.blurb}</p>
                </button>
                {edition?.state === 'error' && (
                  <div className="mt-2 text-[0.6875rem] text-azkar-ink-soft">
                    {edition.error}{' '}
                    <button type="button" className="u-pressable font-bold text-azkar-teal-ink underline" onClick={() => setAttempt((n) => n + 1)}>إعادة المحاولة</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
