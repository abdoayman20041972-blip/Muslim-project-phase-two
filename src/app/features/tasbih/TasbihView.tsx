import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from 'react'
import { BackButton } from '../../components/app-chrome'
import { useConfirmDialog } from '../../components/confirm-dialog'
import {
  getTasbihWords,
  toArabicNumber,
  type View,
} from '../../constants'
import { addCustomTasbih, updateCustomTasbih } from './customTasbih'
import { useCustomTasbihDialog } from './custom-tasbih-dialog'
import { getTasbihButtonColor } from './tasbihButtonColor'

export function TasbihView({
  counts,
  dayTotal,
  selectedWord,
  roundCounts,
  rounds,
  onTap,
  onResetWord,
  onResetToday,
  onSelectWord,
  setView,
}: {
  counts: Record<string, number>
  dayTotal: number
  selectedWord: string | null
  roundCounts: Record<string, number>
  rounds: Record<string, number>
  onTap: (id: string) => void
  onResetWord: (id: string) => void
  onResetToday: () => void
  onSelectWord: (id: string) => void
  setView: (v: View) => void
}) {
  const { confirm } = useConfirmDialog()
  const { dialog: customTasbihDialog, open: openCustomTasbihDialog } = useCustomTasbihDialog()
  const [menuOpen, setMenuOpen] = useState(false)
  const [wordsVersion, setWordsVersion] = useState(0)
  const [announce, setAnnounce] = useState('')
  const selectorRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  // Only the ACTIVE theme's background is rendered (and therefore fetched):
  // the day mosque in light mode, the night mosque in dark mode. Toggling the
  // theme swaps instantly because the .dark class flips on <html>.
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => setIsDark(root.classList.contains('dark')))
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const tasbihWords = useMemo(() => getTasbihWords(), [wordsVersion])
  const wordIndex = Math.max(
    0,
    tasbihWords.findIndex((item) => item.id === selectedWord || item.word === selectedWord),
  )
  const currentWord = tasbihWords[wordIndex] || tasbihWords[0]
  // Read during render: the azkar-settings-changed listener below bumps
  // wordsVersion, which re-renders and picks up a freshly chosen color.
  const buttonColor = getTasbihButtonColor()

  // Phrase picker: full listbox interaction. Escape or a press outside closes
  // it; Arrow/Home/End keys move between options; focus returns to the trigger
  // on close.
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setMenuOpen(false)
      triggerRef.current?.focus()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [menuOpen])

  useEffect(() => {
    if (menuOpen) optionRefs.current[wordIndex]?.focus()
    // Focus the selected option only when the menu OPENS; later focus moves are
    // driven by the arrow keys themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen])

  const moveOptionFocus = (fromIndex: number, delta: number) => {
    const total = tasbihWords.length
    if (!total) return
    const next = ((fromIndex + delta) % total + total) % total
    optionRefs.current[next]?.focus()
  }

  const onOptionKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveOptionFocus(index, 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveOptionFocus(index, -1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      optionRefs.current[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      optionRefs.current[tasbihWords.length - 1]?.focus()
    } else if (event.key === 'Tab') {
      setMenuOpen(false)
    }
  }

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setMenuOpen(true)
    }
  }

  useEffect(() => {
    const refresh = () => setWordsVersion((value) => value + 1)
    window.addEventListener('azkar-tasbih-changed', refresh)
    window.addEventListener('azkar-settings-changed', refresh)
    return () => {
      window.removeEventListener('azkar-tasbih-changed', refresh)
      window.removeEventListener('azkar-settings-changed', refresh)
    }
  }, [])

  const currentRound = currentWord ? (roundCounts[currentWord.id] || 0) : 0
  const completedRounds = currentWord ? (rounds[currentWord.id] || 0) : 0
  const progress = currentWord ? Math.min(currentRound / Math.max(currentWord.goal, 1), 1) : 0
  const totalForWord = currentWord ? (counts[currentWord.id] || 0) : 0
  // 33 small beads around the ring plus one large imam bead. The imam bead is
  // bead #34 in the lighting cycle (it no longer lights first): lit beads =
  // ((round progress - 1) mod 34) + 1, so the small beads light in order up to
  // 33, the imam lights on tap 34, and the next tap starts a new illumination
  // cycle from the first bead. The underlying count/rounds never reset.
  const beadCount = 34
  const litBeads = currentRound > 0 ? ((currentRound - 1) % beadCount) + 1 : 0
  const litRegularBeads = Math.min(litBeads, beadCount - 1)
  const imamBeadLit = litBeads === beadCount
  const beadStep = 360 / beadCount

  const selectWord = (id: string) => {
    onSelectWord(id)
    setMenuOpen(false)
  }

  const handleTap = (event: MouseEvent<HTMLButtonElement>) => {
    if (!currentWord) return
    const next = currentRound + 1
    event.currentTarget.dataset.sound = next >= currentWord.goal ? 'tasbih-complete' : 'tasbih'
    onTap(currentWord.id)
    setAnnounce(
      next >= currentWord.goal
        ? `اكتملت الجولة رقم ${completedRounds + 1}`
        : `العدد ${next} من ${currentWord.goal}`,
    )
  }

  // Kept as a non-visible compatibility path for the legacy tests and dialog.
  const saveLegacyCustom = async (existing: ReturnType<typeof getTasbihWords>[number] | null) => {
    const result = await openCustomTasbihDialog(existing)
    if (!result) return
    try {
      if (existing) {
        updateCustomTasbih(existing.id, { word: result.word, goal: result.goal })
      } else {
        addCustomTasbih({ id: 'custom-' + Date.now().toString(36), word: result.word, goal: result.goal })
      }
      window.dispatchEvent(new Event('azkar-tasbih-changed'))
      setWordsVersion((value) => value + 1)
    } catch (error) { console.debug('[TasbihView]', error) }
  }

  return (
    <>
      {/* v1.2.6: no entrance animation — the screen must appear the instant the
          tab is tapped (the fade+slide used to replay on EVERY visit because
          keep-alive toggles display:none, which restarts CSS animations). */}
      <div dir="rtl" className="tasbih-redesign tasbih-minimal">
        {/* One background at a time: the bright day mosque in light mode or a
            genuinely dark night mosque in dark mode (a real dark IMAGE, not a
            dark veil over a light photo). Only the active theme's image is
            rendered, so the inactive one is never fetched. */}
        <img
          className={isDark ? 'tasbih-background-photo-dark' : 'tasbih-background-photo'}
          src={isDark ? '/img/tasbih-mosque-night.webp' : '/img/tasbih-mosque-background.webp'}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
        />
        <div className="tasbih-background-shade" aria-hidden="true" />
        <header className="tasbih-minimal-header">
          <BackButton onClick={() => setView({ name: 'home' })} />
          <div className="tasbih-minimal-title">
            <div className="font-amiri">السبحة</div>
          </div>

        </header>

        <main className="tasbih-minimal-main" aria-label="عداد السبحة">
          <div className="tasbih-selector-wrap" ref={selectorRef}>
            <button
              type="button"
              ref={triggerRef}
              className="tasbih-current-word"
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              onKeyDown={onTriggerKeyDown}
            >
              <span className="tasbih-current-word-label">الذكر</span>
              <strong>{currentWord?.word ?? 'سبحان الله'}</strong>
              <span className={`tasbih-selector-chevron ${menuOpen ? 'is-open' : ''}`} aria-hidden="true">⌄</span>
            </button>

            {menuOpen && (
              <div className="tasbih-word-menu" role="listbox" aria-label="اختيار الذكر">
                {tasbihWords.map((word, index) => (
                  <button
                    key={word.id}
                    type="button"
                    role="option"
                    ref={(el) => { optionRefs.current[index] = el }}
                    aria-selected={word.id === currentWord?.id}
                    className={`tasbih-word-menu-option ${word.id === currentWord?.id ? 'is-active' : ''}`}
                    onClick={() => selectWord(word.id)}
                    onKeyDown={(event) => onOptionKeyDown(event, index)}
                  >
                    <span>{word.word}</span>
                    <small>{toArabicNumber(word.goal)}</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          <section className="tasbih-counter-card">
            <div className="tasbih-counter-glow" aria-hidden="true" />
            <div className="tasbih-counter-kicker">الجولة الحالية</div>

            <div className="tasbih-bead-stage">
              <div className="tasbih-outer-ring" aria-hidden="true" />
              <div
                className="tasbih-progress-ring"
                aria-hidden="true"
                style={{
                  background: `conic-gradient(from 0deg, hsl(var(--azkar-gold)) ${progress * 360}deg, hsl(var(--azkar-teal) / .20) ${progress * 360}deg)`,
                }}
              />
              <div className="tasbih-beads" aria-hidden="true">
                {Array.from({ length: beadCount - 1 }, (_, index) => {
                  const angle = beadStep * (index + 1)
                  return (
                    <span
                      key={index}
                      className={`tasbih-bead ${index < litRegularBeads ? 'is-lit' : ''}`}
                      style={{ transform: `rotate(${angle}deg) translateY(-8.55rem) rotate(-${angle}deg)` }}
                    />
                  )
                })}
              </div>

              <button
                data-sound="tasbih"
                onClick={handleTap}
                aria-label={`تسجيل تسبيحة لـ ${currentWord?.word ?? 'الذكر الحالي'}، الجولة الحالية ${currentRound} من ${currentWord?.goal ?? 0}`}
                className={`tasbih-count-button tasbih-color-${buttonColor}`}
              >
                <span className="tasbih-count-mark" aria-hidden="true">✦</span>
                <span className="tasbih-count">{toArabicNumber(currentRound)}</span>
                <span className="tasbih-count-goal">من {toArabicNumber(currentWord?.goal ?? 0)}</span>
              </button>
              <span className={`tasbih-imam-bead ${imamBeadLit ? 'is-lit' : ''}`} aria-hidden="true" />
              <span className="tasbih-tassel" aria-hidden="true"><span /></span>
            </div>

            <div className="tasbih-progress-copy">
              <span>{toArabicNumber(currentRound)} / {toArabicNumber(currentWord?.goal ?? 0)}</span>
              <span>{toArabicNumber(Math.round(progress * 100))}%</span>
            </div>

            <div className="tasbih-session-meta" aria-label="إحصاءات السبحة">
              <span className="tasbih-stat">
                <strong>{toArabicNumber(dayTotal)}</strong>
                <small>تسبيحات اليوم</small>
              </span>
              <span className="tasbih-stat">
                <strong>{toArabicNumber(completedRounds)}</strong>
                <small>جولات مكتملة</small>
              </span>
              <span className="tasbih-stat">
                <strong>{toArabicNumber(totalForWord)}</strong>
                <small>إجمالي الذكر</small>
              </span>
            </div>

            <div className="tasbih-visible-actions">
              <button
                type="button"
                className="tasbih-reset-button"
                onClick={async () => {
                  if (currentWord && await confirm({ message: 'تصفير الجولة الحالية؟' })) onResetWord(currentWord.id)
                }}
              >
                تصفير الجولة
              </button>
            </div>
          </section>

          <span className="sr-only">إجمالي اليوم: {toArabicNumber(dayTotal)}</span>

          <div aria-live="polite" className="sr-only">{announce}</div>
        </main>

        {/*
          These controls intentionally stay out of the visual surface.
          Reset, history, motivation and custom-phrase management belong in Settings.
        */}
        <div className="sr-only" aria-hidden="false">
          <button
            type="button"
            onClick={async () => {
              if (currentWord && await confirm({ message: 'تصفير الجولة الحالية؟' })) onResetWord(currentWord.id)
            }}
          >
            تصفير الجولة
          </button>
          <button
            type="button"
            onClick={async () => {
              if (await confirm({ message: 'تصفير إجمالي تسبيح اليوم؟', danger: true })) onResetToday()
            }}
          >
            تصفير اليوم
          </button>
          <button type="button" onClick={() => saveLegacyCustom(null)}>إضافة ذكر مخصص</button>
          {tasbihWords.filter((word) => word.id.startsWith('custom-')).map((word) => (
            <span key={`label-${word.id}`} className="sr-only">{word.word}</span>
          ))}
          {tasbihWords.filter((word) => word.id.startsWith('custom-')).map((word) => (
            <button
              key={word.id}
              type="button"
              onClick={() => saveLegacyCustom(word)}
              aria-label={`تعديل ${word.word}`}
            >
              تعديل {word.word}
            </button>
          ))}
        </div>
      </div>
      {customTasbihDialog}
    </>
  )
}
