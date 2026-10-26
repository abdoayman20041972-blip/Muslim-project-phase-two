import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { BackButton } from '../../components/app-chrome'
import { useConfirmDialog } from '../../components/confirm-dialog'
import {
  getTasbihWords,
  toArabicNumber,
  type View,
} from '../../constants'
import { addCustomTasbih, updateCustomTasbih } from './customTasbih'
import { useCustomTasbihDialog } from './custom-tasbih-dialog'

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

  const tasbihWords = useMemo(() => getTasbihWords(), [wordsVersion])
  const wordIndex = Math.max(
    0,
    tasbihWords.findIndex((item) => item.id === selectedWord || item.word === selectedWord),
  )
  const currentWord = tasbihWords[wordIndex] || tasbihWords[0]

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
  const beadCount = 33
  // The prominent imam bead is bead #1; the 32 surrounding beads are #2–#33.
  const litRegularBeads = Math.max(0, Math.min(currentRound - 1, beadCount - 1))
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
    } catch {}
  }

  return (
    <>
      <div dir="rtl" className="tasbih-redesign tasbih-minimal animate-in fade-in slide-in-from-bottom-2 duration-300">
        <img
          className="tasbih-background-photo"
          src="/img/tasbih-mosque-background.jpg"
          alt=""
          aria-hidden="true"
          loading="eager"
        />
        <div className="tasbih-background-shade" aria-hidden="true" />
        <header className="tasbih-minimal-header">
          <BackButton onClick={() => setView({ name: 'home' })} />
          <div className="tasbih-minimal-title">
            <div className="font-amiri">السبحة</div>
          </div>

        </header>

        <main className="tasbih-minimal-main" aria-label="عداد السبحة">
          <div className="tasbih-selector-wrap">
            <button
              type="button"
              className="tasbih-current-word"
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="tasbih-current-word-label">الذكر</span>
              <strong>{currentWord?.word ?? 'سبحان الله'}</strong>
              <span className={`tasbih-selector-chevron ${menuOpen ? 'is-open' : ''}`} aria-hidden="true">⌄</span>
            </button>

            {menuOpen && (
              <div className="tasbih-word-menu" role="listbox" aria-label="اختيار الذكر">
                {tasbihWords.map((word) => (
                  <button
                    key={word.id}
                    type="button"
                    role="option"
                    aria-selected={word.id === currentWord?.id}
                    className={`tasbih-word-menu-option ${word.id === currentWord?.id ? 'is-active' : ''}`}
                    onClick={() => selectWord(word.id)}
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
                className="tasbih-count-button"
              >
                <span className="tasbih-count-mark" aria-hidden="true">✦</span>
                <span className="tasbih-count">{toArabicNumber(currentRound)}</span>
                <span className="tasbih-count-goal">من {toArabicNumber(currentWord?.goal ?? 0)}</span>
              </button>
              <span className={`tasbih-imam-bead ${currentRound > 0 ? 'is-lit' : ''}`} aria-hidden="true" />
              <span className="tasbih-tassel" aria-hidden="true"><span /></span>
            </div>

            <div className="tasbih-progress-copy">
              <span>{toArabicNumber(currentRound)} / {toArabicNumber(currentWord?.goal ?? 0)}</span>
              <span>{toArabicNumber(Math.round(progress * 100))}%</span>
            </div>

            <div className="tasbih-session-meta" aria-label="إحصاءات السبحة">
              <span>اليوم {toArabicNumber(dayTotal)}</span>
              <span>{toArabicNumber(completedRounds)} جولات مكتملة</span>
              <span>إجمالي الذكر {toArabicNumber(totalForWord)}</span>
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
