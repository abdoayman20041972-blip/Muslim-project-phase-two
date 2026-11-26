import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { toArabicNumber } from '../../../constants'
import type { SurahMeta } from '../../../../quran-meta'
import { loadCenterVersion, loadSurahInfos, loadReviewStatuses, scopeAllowed, QC_REVIEW_ONLY, type ReviewStatuses, type SurahInfo } from './quranCenterData'

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

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.9rem] border border-azkar-gold-soft bg-azkar-bg-alt px-3 py-2 text-center">
      <div className="text-[0.6875rem] text-azkar-ink-soft">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-azkar-teal-ink">{value}</div>
    </div>
  )
}

/** "About this surah" card: type, revelation order, brief and virtue from the bundled dataset. */
export function SurahInfoCard({ surah, onClose }: { surah: SurahMeta; onClose: () => void }) {
  const [info, setInfo] = useState<SurahInfo | null | 'loading'>('loading')
  const [version, setVersion] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<ReviewStatuses | null>(null)
  useEffect(() => {
    let cancelled = false
    loadCenterVersion().then((value) => { if (!cancelled) setVersion(value) })
    // Gate the FETCH, not only the render: the metadata file is never
    // requested while its scope is locked (fail-closed when status absent).
    loadReviewStatuses().then((value) => {
      if (cancelled) return
      setStatuses(value)
      if (!scopeAllowed(value.metadata)) return
      loadSurahInfos().then((list) => {
        if (!cancelled) setInfo(list?.find((row) => row.surah === surah.number) ?? null)
      })
    })
    return () => { cancelled = true }
  }, [surah.number])

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`عن سورة ${surah.shortName}`}
        onKeyDown={trapDialogFocus}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-x-0 bottom-0 mx-auto flex max-h-[86vh] w-full max-w-md flex-col rounded-t-[2rem] border-t border-azkar-gold-soft bg-azkar-card shadow-2xl focus:outline-none"
      >
        <div className="shrink-0 border-b border-azkar-gold-soft px-5 pb-3 pt-5">
          <div className="flex items-center justify-between">
            <div className="font-amiri text-lg font-bold">عن سورة {surah.shortName}</div>
            <button
              onClick={onClose}
              aria-label="إغلاق معلومات السورة"
              autoFocus
              className="flex h-9 w-9 items-center justify-center rounded-full bg-azkar-bg-alt"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {!statuses ? (
            <div className="py-12 text-center text-sm text-azkar-ink-soft">جارٍ التحميل…</div>
          ) : !scopeAllowed(statuses.metadata) ? (
            // Runtime gate: classification/wording decisions (review §3D/§3E) are still open.
            <div className="py-12 text-center text-sm leading-7 text-azkar-ink-soft" role="note">
              معلومات السورة موقوفة مؤقتًا لحين اعتماد المراجعة العلمية.
            </div>
          ) : info === 'loading' ? (
            <div className="py-12 text-center text-sm text-azkar-ink-soft">جارٍ التحميل…</div>
          ) : !info ? (
            <div className="py-12 text-center text-sm text-azkar-ink-soft">تعذر تحميل معلومات السورة.</div>
          ) : (
            <div className="space-y-5">
              {statuses?.metadata === 'pending' && QC_REVIEW_ONLY && (
                <div className="rounded-[0.9rem] border border-amber-300/60 bg-amber-50 px-3.5 py-2.5 text-[0.75rem] leading-6 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200" role="note">
                  وضع المراجعة الداخلية: يُعرض محتوى لم تكتمل مراجعته العلمية — ليس للإصدار.
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Chip label="نوعها" value={info.type} />
                <Chip label="ترتيب نزولها" value={info.descentOrder ? toArabicNumber(info.descentOrder) : '—'} />
                <Chip label="عدد آياتها" value={toArabicNumber(surah.numberOfAyahs)} />
                <Chip label="عدد ألفاظها" value={info.wordsCount ? toArabicNumber(info.wordsCount) : '—'} />
              </div>
              {info.introduction && (
                <section aria-label="نبذة عن السورة">
                  <h3 className="mb-2 text-sm font-bold text-azkar-teal-ink">نبذة عن السورة</h3>
                  <p className="text-[0.9375rem] leading-8 text-azkar-ink whitespace-pre-line">{info.introduction}</p>
                </section>
              )}
              {info.grace && statuses && scopeAllowed(statuses.virtues) && (
                <section aria-label="فضل السورة">
                  <h3 className="mb-2 text-sm font-bold text-azkar-teal-ink">فضلها</h3>
                  <div className="mb-2 rounded-[0.9rem] border border-amber-300/60 bg-amber-50 px-3.5 py-2.5 text-[0.75rem] leading-6 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200" role="note">
                    تُعرض الأخبار كما وردت في مصدرها بأسانيدها، وبعضها يحتاج إلى تخريجٍ ومراجعةٍ علمية.
                  </div>
                  <p className="text-[0.9375rem] leading-8 text-azkar-ink whitespace-pre-line">{info.grace}</p>
                </section>
              )}
              <div className="text-center text-[0.6875rem] leading-5 text-azkar-ink-soft">
                المصدر: الموسوعة القرآنية (quranpedia.net){version ? ` · إصدار البيانات ${version}` : ''}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
