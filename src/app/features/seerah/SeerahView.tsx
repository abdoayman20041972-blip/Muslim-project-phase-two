import { useState } from 'react'
import { ArrowRight, BookOpen, ChevronDown } from 'lucide-react'
import { SEERAH_CHAPTERS } from './seerahData'

/** Reading and lessons on the life of the Prophet. Text is local; links open the Qur'an or hadith source. */
export function SeerahView({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState<string | null>(SEERAH_CHAPTERS[0].id)
  return (
    <section dir="rtl" className="w-full min-w-0" data-testid="seerah-view">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="رجوع" className="u-pressable flex h-10 w-10 items-center justify-center rounded-full border border-azkar-hairline bg-azkar-card text-azkar-teal-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold">
          <ArrowRight className="h-5 w-5" />
        </button>
        <h1 className="font-amiri text-[1.75rem] font-bold text-azkar-teal-ink">السيرة النبوية</h1>
      </div>
      <p className="mt-3 px-1 text-[0.8125rem] font-semibold leading-6 text-azkar-ink-soft">قراءة موجزة وخلاصة للتأمل من كل محطة. للتوسع ارجع إلى كتب السيرة الكاملة.</p>
      <div className="mt-4 flex flex-col gap-3">
        {SEERAH_CHAPTERS.map((chapter, index) => {
          const expanded = open === chapter.id
          return (
            <article key={chapter.id} data-testid="seerah-chapter" className="overflow-hidden rounded-2xl border border-azkar-hairline bg-azkar-card u-shadow-1">
              <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : chapter.id)} className="u-pressable flex w-full items-center gap-3 px-4 py-3 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-azkar-teal-tint font-amiri text-[1rem] font-bold text-azkar-teal-ink" aria-hidden="true">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-amiri text-[1.2rem] font-bold leading-snug text-azkar-teal-ink">{chapter.title}</span>
                  <span className="block text-[0.75rem] font-semibold text-azkar-ink-faint">{chapter.period}</span>
                </span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-azkar-ink-soft transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {expanded && (
                <div className="border-t border-azkar-hairline px-4 pb-4 pt-3">
                  {chapter.body.map((paragraph) => <p key={paragraph} className="text-[0.9688rem] leading-8 text-azkar-ink">{paragraph}</p>)}
                  <div className="mt-3 rounded-xl bg-azkar-gold-tint/60 px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-[0.75rem] font-bold text-azkar-gold"><BookOpen className="h-3.5 w-3.5" aria-hidden="true" />خلاصة للتأمل</span>
                    <p className="mt-1 text-[0.9063rem] font-semibold leading-7 text-azkar-ink">{chapter.lesson}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[0.6875rem] font-bold text-azkar-ink-faint">المصدر:</span>
                    {chapter.sources.map((source) => source.url
                      ? <a key={source.label} href={source.url} target="_blank" rel="noreferrer" className="text-[0.75rem] font-bold text-azkar-teal underline underline-offset-2">{source.label}</a>
                      : <span key={source.label} className="text-[0.75rem] text-azkar-ink-soft">{source.label}</span>)}
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
