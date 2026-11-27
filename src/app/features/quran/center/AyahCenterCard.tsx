import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { toArabicNumber, type Ayah } from '../../../constants'
import type { SurahMeta } from '../../../../quran-meta'
import { loadAsbab, loadGharib, loadReviewStatuses, scopeAllowed, QC_REVIEW_ONLY, type AsbabMap, type GharibMap, type ScopeStatus } from './quranCenterData'
import { CopyButton } from '../../azkar/CopyButton'
import { MemorizePanel } from './MemorizePanel'
import type { QuranAudioReciter } from '../quranAudioPlayback'

export type CenterTab = 'tafsir' | 'gharib' | 'asbab' | 'memorize'

const TABS: { id: CenterTab; label: string }[] = [
  { id: 'tafsir', label: 'التفسير' },
  { id: 'gharib', label: 'معاني الكلمات' },
  { id: 'asbab', label: 'سبب النزول' },
  { id: 'memorize', label: 'الحفظ بالتكرار' },
]

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function trapDialogFocus(e: ReactKeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'Tab') return
  const items = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>('button,select,input,[tabindex]:not([tabindex="-1"])'),
  ).filter((x) => !x.hasAttribute('disabled'))
  if (!items.length) return
  const first = items[0], last = items[items.length - 1]
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}

type TafsirSlot = {
  text: string | null
  loading: boolean
  error: boolean
  label: string
  /** True when the loaded tafsir belongs to this card's ayah. */
  forThisAyah: boolean
}

type Props = {
  surah: SurahMeta
  ayah: Ayah
  ayahs: Ayah[]
  initialTab?: CenterTab
  reciter: QuranAudioReciter
  tafsir: TafsirSlot
  onTafsirTab: () => void
  onClose: () => void
  hideText: boolean
  onHideTextChange: (value: boolean) => void
}

/** Shown in review-only builds above content whose review is still pending. */
function ReviewOnlyBanner() {
  if (!QC_REVIEW_ONLY) return null
  return (
    <div className="mb-3 rounded-[0.9rem] border border-amber-300/60 bg-amber-50 px-3.5 py-2.5 text-[0.75rem] leading-6 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200" role="note">
      وضع المراجعة الداخلية: يُعرض محتوى لم تكتمل مراجعته العلمية — ليس للإصدار.
    </div>
  )
}

function GharibTab({ surah, ayah }: { surah: SurahMeta; ayah: Ayah }) {
  const [map, setMap] = useState<GharibMap | null | 'loading' | 'gated'>('loading')
  const [status, setStatus] = useState<ScopeStatus>('pending')
  useEffect(() => {
    let cancelled = false
    setMap('loading')
    // Runtime gate: the upstream dump misplaces entries on wrong ayahs at scale;
    // content stays hidden until the independent reviewer verifies the corrections.
    loadReviewStatuses().then((statuses) => {
      if (cancelled) return
      setStatus(statuses.gharib)
      if (!scopeAllowed(statuses.gharib)) { setMap('gated'); return }
      loadGharib(surah.number).then((value) => { if (!cancelled) setMap(value) })
    })
    return () => { cancelled = true }
  }, [surah.number])
  if (map === 'loading') {
    return <div className="py-12 text-center text-sm text-azkar-ink-soft">جارٍ تحميل معاني الكلمات…</div>
  }
  if (map === 'gated') {
    return (
      <div className="py-12 text-center text-sm leading-7 text-azkar-ink-soft" role="note">
        معاني الكلمات موقوفة مؤقتًا للمراجعة العلمية: وُجد في المصدر مواضع منسوبة لآياتٍ غير آياتها، وتُعاد بعد اكتمال التصحيح والتحقق.
      </div>
    )
  }
  const entries = map?.[String(ayah.numberInSurah)] ?? []
  if (!entries.length) {
    return (
      <div className="py-12 text-center text-sm leading-7 text-azkar-ink-soft">
        لا توجد ألفاظ مشروحة لهذه الآية في المصادر المتاحة.
        <br />
        شرح الغريب يخص الألفاظ المشكلة، فلا يشمل كل الآيات.
        <br />
        التغطية حاليًا جزئية قيد المراجعة، وقد تُضاف مواضع أخرى بعد اكتمالها.
      </div>
    )
  }
  return (
    <div className="space-y-5">
      {status === 'pending' && <ReviewOnlyBanner />}
      {entries.map((entry, index) => (
        <section key={`${entry.book}-${index}`} aria-label={entry.book}>
          <div className="mb-2 text-[0.8125rem] font-bold text-azkar-ink-soft">
            {entry.book} · {entry.author}
          </div>
          <div className="mb-2"><CopyButton text={entry.words.map((w) => `${w.text}: ${w.meaning}`).join('\n')} reference={`${entry.book} · ${entry.author}`} /></div>
          <dl className="space-y-2.5">
            {entry.words.map((word, wordIndex) => (
              <div key={wordIndex} className="rounded-[0.9rem] border border-azkar-gold-soft bg-azkar-bg-alt px-3.5 py-2.5">
                <dt className="font-quran text-[1.0625rem] font-bold text-azkar-teal-ink">{word.text}</dt>
                <dd className="mt-0.5 text-[0.9375rem] leading-7 text-azkar-ink">{word.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}

function AsbabTab({ surah, ayah }: { surah: SurahMeta; ayah: Ayah }) {
  const [map, setMap] = useState<AsbabMap | null | 'loading'>('loading')
  const [status, setStatus] = useState<ScopeStatus>('pending')
  useEffect(() => {
    let cancelled = false
    setMap('loading')
    // Runtime gate: al-Wahidi's chains are ungraded; render only after the
    // specialist review clears the scope (or in an explicit review-only build).
    loadReviewStatuses().then((statuses) => {
      if (cancelled) return
      setStatus(statuses.asbab)
      if (!scopeAllowed(statuses.asbab)) { setMap(null); return }
      loadAsbab(surah.number).then((value) => { if (!cancelled) setMap(value) })
    })
    return () => { cancelled = true }
  }, [surah.number])
  if (map === 'loading') {
    return <div className="py-12 text-center text-sm text-azkar-ink-soft">جارٍ تحميل سبب النزول…</div>
  }
  // No asbab pack installed: the narrations ship only after the agreed
  // scholarly review. Say exactly that - never imply no cause was narrated.
  if (!map) {
    return (
      <div className="py-12 text-center text-sm leading-7 text-azkar-ink-soft">
        لا تتوفر روايةُ سببِ نزولٍ مدققة لهذه الآية في النسخة الحالية.
        <br />
        ليس لكل آية سببُ نزولٍ مروي، والتغطية تتسع مع اكتمال المراجعة.
      </div>
    )
  }
  const entries = map[String(ayah.numberInSurah)] ?? null
  if (!entries || !entries.length) {
    return (
      <div className="py-12 text-center text-sm leading-7 text-azkar-ink-soft">
        لا تتوفر روايةُ سببِ نزولٍ مدققة لهذه الآية في النسخة الحالية.
        <br />
        ليس لكل آية سببُ نزولٍ مروي، والتغطية تتسع مع اكتمال المراجعة.
      </div>
    )
  }
  return (
    <div>
      <div className="mb-3 rounded-[0.9rem] border border-emerald-300/60 bg-emerald-50 px-3.5 py-2.5 text-[0.75rem] leading-6 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200" role="note">
        سبب النزول بحسب المرجع المذكور، مع بيان درجة الرواية. التغطية تقتصر على الروايات المراجعة في هذه النسخة، وليس لكل آية سبب نزول مروي.
      </div>
      {status === 'pending' && <ReviewOnlyBanner />}
      {entries.map((entry, i) => (
        <div key={i} className={i > 0 ? 'mt-5 border-t border-azkar-line pt-4' : ''}>
          <div className="font-cairo text-[1.0625rem] leading-[2] text-azkar-ink whitespace-pre-line">{entry.text}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.8125rem] text-azkar-ink-soft">
            {entry.relation === 'متعلقة' && <span className="rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">رواية متعلقة بنزول الآية</span>}
            <span className="rounded-full border border-emerald-300/60 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">{entry.grade}</span>
            <span>{entry.reference}</span>
            <CopyButton text={entry.text} reference={entry.reference} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Unified ayah card: tafsir, word meanings, revelation context and memorization in one sheet. */
export function AyahCenterCard({ surah, ayah, ayahs, initialTab = 'tafsir', reciter, tafsir, onTafsirTab, onClose, hideText, onHideTextChange }: Props) {
  const [tab, setTab] = useState<CenterTab>(initialTab)
  useEffect(() => { if (tab === 'tafsir') onTafsirTab() }, [tab, onTafsirTab])

  const onTabKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const index = TABS.findIndex((item) => item.id === tab)
    const step = e.key === 'ArrowLeft' ? -1 : 1
    const next = TABS[(index + step + TABS.length) % TABS.length]
    setTab(next.id)
    requestAnimationFrame(() => {
      document.getElementById(`quran-center-tab-${next.id}`)?.focus()
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`بطاقة الآية ${toArabicNumber(ayah.numberInSurah)}`}
        onKeyDown={trapDialogFocus}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-x-0 bottom-0 mx-auto flex max-h-[86vh] w-full max-w-md flex-col rounded-t-[2rem] border-t border-azkar-gold-soft bg-azkar-card shadow-2xl focus:outline-none"
      >
        <div className="shrink-0 border-b border-azkar-gold-soft px-5 pb-3 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-cairo text-lg font-bold">
                الآية {toArabicNumber(ayah.numberInSurah)} · {surah.shortName}
              </div>
              <div className="mt-1 text-[0.8125rem] text-azkar-ink-soft">مركز القرآن</div>
            </div>
            <button
              onClick={onClose}
              aria-label="إغلاق بطاقة الآية"
              autoFocus
              className="flex h-9 w-9 items-center justify-center rounded-full bg-azkar-bg-alt"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5" role="tablist" aria-label="أقسام بطاقة الآية" onKeyDown={onTabKeyDown}>
            {TABS.map((item) => (
              <button
                key={item.id}
                id={`quran-center-tab-${item.id}`}
                role="tab"
                aria-selected={tab === item.id}
                aria-controls="quran-center-tabpanel"
                tabIndex={tab === item.id ? 0 : -1}
                onClick={() => setTab(item.id)}
                className={`u-pressable rounded-[0.8rem] px-1 py-2 text-[0.6875rem] font-bold leading-4 ${
                  tab === item.id
                    ? 'bg-azkar-teal text-azkar-card'
                    : 'bg-azkar-bg-alt text-azkar-ink-soft'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto px-5 py-5"
          role="tabpanel"
          id="quran-center-tabpanel"
          aria-labelledby={`quran-center-tab-${tab}`}
        >
          {tab === 'tafsir' && (
            tafsir.loading || !tafsir.forThisAyah ? (
              <div className="py-12 text-center text-sm text-azkar-ink-soft">جارٍ تحميل التفسير...</div>
            ) : tafsir.error ? (
              <div className="py-12 text-center text-sm text-azkar-ink-soft">
                تعذر تحميل التفسير. تحقق من الاتصال بالإنترنت ثم حاول مرة أخرى.
              </div>
            ) : (
              <div>
                <div className="font-cairo text-[1.125rem] leading-[2.05] text-azkar-ink whitespace-pre-line">{tafsir.text}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.8125rem] text-azkar-ink-soft">
                  <span>{tafsir.label}</span>
                  <CopyButton text={tafsir.text ?? ''} reference={tafsir.label} />
                </div>
              </div>
            )
          )}
          {tab === 'gharib' && <GharibTab surah={surah} ayah={ayah} />}
          {tab === 'asbab' && <AsbabTab surah={surah} ayah={ayah} />}
          {tab === 'memorize' && (
            <MemorizePanel
              surah={surah}
              ayahs={ayahs}
              startAyah={ayah}
              reciter={reciter}
              hideText={hideText}
              onHideTextChange={onHideTextChange}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
