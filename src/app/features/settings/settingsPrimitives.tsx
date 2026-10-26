import type { ReactNode } from 'react'

export function Row({
  title,
  description,
  children,
  stacked = false,
  last = false,
}: {
  title: string
  description?: string
  children: ReactNode
  stacked?: boolean
  last?: boolean
}) {
  return (
    <div
      className={`min-h-16 gap-3 px-4 py-3 ${stacked ? 'flex flex-col items-stretch' : 'flex items-center'} ${last ? '' : 'border-b border-azkar-gold-soft/50'}`}
    >
      <div className={`min-w-0 text-right ${stacked ? 'w-full' : 'flex-1'}`}>
        <div className="text-[13px] font-bold text-azkar-ink">{title}</div>
        {description && (
          <div className="mt-1 text-[10px] leading-5 text-azkar-ink-soft">{description}</div>
        )}
      </div>
      {children}
    </div>
  )
}
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 px-2 font-amiri text-sm font-bold text-azkar-teal-ink">{title}</h2>
      <div className="overflow-hidden rounded-[var(--r-lg)] border border-azkar-gold-soft bg-azkar-card shadow-sm">
        {children}
      </div>
    </section>
  )
}
export function Choice({
  current,
  onChange,
  labels,
}: {
  current: string
  onChange: (v: string) => void
  labels: Record<string, string>
}) {
  return (
    <div dir="rtl" className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
      {Object.entries(labels).map(([k, v]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          aria-pressed={current === k}
          className={`min-h-11 min-w-0 rounded-xl border px-2 py-2 text-center text-[10px] font-bold leading-5 ${current === k ? 'border-azkar-teal bg-azkar-teal text-azkar-card' : 'border-azkar-gold-soft bg-azkar-bg-alt text-azkar-ink-soft'}`}
        >
          {v}
        </button>
      ))}
    </div>
  )
}
