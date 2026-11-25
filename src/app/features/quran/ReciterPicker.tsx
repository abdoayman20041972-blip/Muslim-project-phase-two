import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { QURAN_AUDIO_RECITER_LABELS, QURAN_AUDIO_RECITERS, type QuranAudioReciter } from './quranAudioPlayback'

type Props = {
  value: string
  onChange: (reciter: QuranAudioReciter) => void
  label: string
  className?: string
}

/** App-styled reciter list: a pill that opens a sheet, instead of the system dropdown. */
export function ReciterPicker({ value, onChange, label, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  const current = QURAN_AUDIO_RECITER_LABELS[value as QuranAudioReciter] ?? value
  return (
    <>
      <button type="button" aria-label={label} aria-haspopup="dialog" aria-expanded={open} data-testid="reciter-picker"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => setOpen(true)}
        className={'u-pressable flex min-w-0 items-center justify-between gap-1.5 rounded-full border border-azkar-gold-soft bg-azkar-bg-alt px-3 text-xs font-bold text-azkar-teal-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold ' + className}>
        <span className="min-w-0 truncate">{current}</span>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45" onClick={() => setOpen(false)} data-testid="reciter-sheet-backdrop">
          <div role="dialog" aria-modal="true" aria-labelledby={titleId} dir="rtl" onClick={(event) => event.stopPropagation()}
            className="max-h-[78vh] w-full max-w-md overflow-y-auto rounded-t-[1.6rem] border border-azkar-gold-soft bg-azkar-card px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-azkar-hairline" aria-hidden="true" />
            <h2 id={titleId} className="mb-2 font-amiri text-lg font-bold text-azkar-teal-ink">اختيار القارئ</h2>
            <ul className="space-y-1.5">
              {QURAN_AUDIO_RECITERS.map((id) => {
                const selected = id === value
                return (
                  <li key={id}>
                    <button type="button" role="option" aria-selected={selected}
                      onClick={() => { setOpen(false); if (!selected) onChange(id) }}
                      className={'u-pressable flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 text-sm font-bold ' +
                        (selected ? 'border-azkar-gold bg-azkar-teal-deep text-azkar-card' : 'border-azkar-hairline bg-azkar-bg-alt text-azkar-teal-ink')}>
                      <span>{QURAN_AUDIO_RECITER_LABELS[id]}</span>
                      {selected && <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
