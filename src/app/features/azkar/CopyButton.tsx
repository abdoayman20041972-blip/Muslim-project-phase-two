import { copyWithToast } from './shareActions'

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

const BASE =
  'u-pressable inline-flex h-8 items-center gap-1.5 rounded-full border border-azkar-hairline bg-azkar-surface-1 px-3 text-[0.8125rem] font-bold text-azkar-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal'

/** "نسخ" button: copies the text and its reference to the clipboard and shows a short notice. */
export function CopyButton({ text, reference, label = 'نسخ', className = '' }: { text: string; reference?: string; label?: string; className?: string }) {
  return (
    <button type="button" data-sound="none" aria-label={label} onClick={() => void copyWithToast(text, reference)} className={`${BASE} ${className}`.trim()}>
      <CopyIcon />
      <span>نسخ</span>
    </button>
  )
}
