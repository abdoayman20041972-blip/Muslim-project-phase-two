import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { getTasbihWords, normalizeTasbihText, type TasbihWord } from '../../constants'

export function useCustomTasbihDialog(): {
  dialog: ReactNode
  open: (existing: TasbihWord | null) => Promise<{ word: string; goal: number } | null>
} {
  const resolverRef = useRef<((value: { word: string; goal: number } | null) => void) | null>(null)
  const [state, setState] = useState<{ existing: TasbihWord | null; word: string; goal: string } | null>(null)
  const [wordError, setWordError] = useState('')
  const [goalError, setGoalError] = useState('')
  const wordInputRef = useRef<HTMLInputElement>(null)

  const close = useCallback((value: { word: string; goal: number } | null) => {
    const resolve = resolverRef.current
    resolverRef.current = null
    setState(null)
    setWordError('')
    setGoalError('')
    resolve?.(value)
  }, [])

  const open = useCallback((existing: TasbihWord | null) => {
    if (resolverRef.current) {
      resolverRef.current(null)
    }
    setWordError('')
    setGoalError('')
    setState({ existing, word: existing?.word ?? '', goal: String(existing?.goal ?? 33) })
    return new Promise<{ word: string; goal: number } | null>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  useEffect(() => {
    if (!state) return
    wordInputRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state, close])

  useEffect(() => () => resolverRef.current?.(null), [])

  const save = () => {
    if (!state) return
    const word = state.word.trim()
    let valid = true

    if (!word) {
      setWordError('الاسم مطلوب.')
      valid = false
    } else {
      const normalized = normalizeTasbihText(word)
      const duplicate = getTasbihWords().some(
        (item) => item.id !== state.existing?.id && normalizeTasbihText(item.word) === normalized,
      )
      setWordError(duplicate ? 'هذا الذكر موجود بالفعل.' : '')
      if (duplicate) valid = false
    }

    const numeric = Number(state.goal)
    const goal = Number.isInteger(numeric) ? numeric : Math.round(numeric)
    if (!state.goal.trim() || !Number.isFinite(numeric) || !Number.isInteger(numeric) || numeric < 1 || numeric > 10000) {
      setGoalError('أدخل رقمًا بين 1 و10000.')
      valid = false
    } else {
      setGoalError('')
    }

    if (valid) close({ word, goal })
  }

  const dialog = state ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-azkar-bg/95 p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close(null)
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-azkar-gold-soft bg-azkar-card p-8 text-center shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-tasbih-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="custom-tasbih-dialog-title" className="font-amiri text-xl font-bold text-azkar-teal-ink">
          {state.existing ? 'تعديل الذكر' : 'إضافة ذكر مخصص'}
        </h2>
        <div className="mt-5 text-right">
          <label htmlFor="custom-tasbih-word" className="mb-1 block text-sm text-azkar-ink">
            اسم الذكر
          </label>
          <input
            ref={wordInputRef}
            id="custom-tasbih-word"
            value={state.word}
            onChange={(event) => {
              setState((current) => current ? { ...current, word: event.target.value } : current)
              if (wordError) setWordError('')
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') close(null)
              if (event.key === 'Enter') save()
            }}
            className="w-full rounded-2xl border border-azkar-hairline bg-azkar-bg-alt px-4 py-3 text-sm outline-none focus:border-azkar-teal"
          />
          {wordError && <p className="mt-1 text-xs text-red-600">{wordError}</p>}
        </div>
        <div className="mt-4 text-right">
          <label htmlFor="custom-tasbih-goal" className="mb-1 block text-sm text-azkar-ink">
            الهدف
          </label>
          <input
            id="custom-tasbih-goal"
            type="number"
            min={1}
            max={10000}
            step={1}
            value={state.goal}
            onChange={(event) => {
              setState((current) => current ? { ...current, goal: event.target.value } : current)
              if (goalError) setGoalError('')
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') close(null)
              if (event.key === 'Enter') save()
            }}
            className="w-full rounded-2xl border border-azkar-hairline bg-azkar-bg-alt px-4 py-3 text-sm outline-none focus:border-azkar-teal"
          />
          {goalError && <p className="mt-1 text-xs text-red-600">{goalError}</p>}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => close(null)}
            className="rounded-full border border-azkar-gold-soft px-4 py-2 text-sm text-azkar-teal-ink"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-full bg-azkar-teal px-4 py-2 text-sm text-azkar-card"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { dialog, open }
}
