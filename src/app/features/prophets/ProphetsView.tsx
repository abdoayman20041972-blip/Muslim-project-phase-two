import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, ScrollText } from 'lucide-react'
import { PROPHET_STORIES, type ProphetStory } from './prophetsData'
import { readSetting } from '../../settings'

export function ProphetsView({ onBack }: { onBack: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const story = selectedId ? PROPHET_STORIES.find((s) => s.id === selectedId) ?? null : null
  const storyIndex = story ? PROPHET_STORIES.indexOf(story) : -1
  const nextStory = storyIndex >= 0 && storyIndex < PROPHET_STORIES.length - 1 ? PROPHET_STORIES[storyIndex + 1] : null

  return (
    <section dir="rtl" className="hadith-screen animate-in fade-in slide-in-from-bottom-2 duration-300">
      {story ? (
        <StoryReader
          story={story}
          index={storyIndex}
          onBack={() => setSelectedId(null)}
          onNext={nextStory ? () => setSelectedId(nextStory.id) : null}
        />
      ) : (
        <StoryList onSelect={setSelectedId} onBack={onBack} />
      )}
    </section>
  )
}

function StoryList({ onSelect, onBack }: { onSelect: (id: string) => void; onBack: () => void }) {
  return (
    <>
      <header className="hadith-header">
        <button type="button" onClick={onBack} aria-label="رجوع" className="u-pressable hadith-icon-button">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-amiri text-2xl font-bold text-azkar-teal-ink">قصص الأنبياء</h1>
          <p className="mt-0.5 text-[10px] text-azkar-ink-faint">عِبرٌ من سيرة أولي العزم، بالقرآن والسيرة</p>
        </div>
        <span className="hadith-mark" aria-hidden="true"><ScrollText className="h-4 w-4" /></span>
      </header>

      <div className="mb-1 flex items-center justify-between px-1">
        <span className="font-amiri text-base font-bold text-azkar-teal-ink">{PROPHET_STORIES.length} نبيًّا من قصص القرآن</span>
        <span className="text-[9px] text-azkar-ink-faint">{PROPHET_STORIES.length} قصة</span>
      </div>

      <ul className="grid gap-3">
        {PROPHET_STORIES.map((story, i) => (
          <li key={story.id}>
            <button type="button" onClick={() => onSelect(story.id)} className="u-pressable ps-card">
              <span className="ps-card-num" aria-hidden="true">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="ps-card-name font-amiri">{story.name}</span>
                  <span className="ps-card-epithet">{story.epithet}</span>
                </span>
                <span className="mt-1 block text-[11px] leading-relaxed text-azkar-ink-soft">{story.summary}</span>
              </span>
              <ArrowLeft className="h-4 w-4 shrink-0 text-azkar-gold-deep" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <p className="ps-source">المصادر: القرآن الكريم، وصحيح البخاري ومسلم، وسيرة ابن هشام، وقصص الأنبياء لابن كثير</p>
    </>
  )
}

function StoryReader({ story, index, onBack, onNext }: { story: ProphetStory; index: number; onBack: () => void; onNext: (() => void) | null }) {
  const [font, setFont] = useState(() => readSetting('prophet_font', 'md'))
  const [showQuestion, setShowQuestion] = useState(() => readSetting('azkar_prophet_show_question', '1') !== '0')
  useEffect(() => {
    const refresh = () => {
      setFont(readSetting('prophet_font', 'md'))
      setShowQuestion(readSetting('azkar_prophet_show_question', '1') !== '0')
    }
    window.addEventListener('azkar-settings-changed', refresh)
    return () => window.removeEventListener('azkar-settings-changed', refresh)
  }, [])
  const fontClass = font === 'sm' ? 'text-[13px]' : font === 'lg' ? 'text-[18px]' : 'text-[15px]'
  return (
    <article>
      <header className="hadith-header">
        <button type="button" onClick={onBack} aria-label="عودة إلى القائمة" className="u-pressable hadith-icon-button">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-amiri text-2xl font-bold text-azkar-teal-ink">{story.name}</h1>
          <p className="mt-0.5 text-[10px] text-azkar-ink-faint">{story.epithet} · {story.era}</p>
        </div>
        <span className="ps-count" aria-hidden="true">{index + 1}/{PROPHET_STORIES.length}</span>
      </header>

      <ol className="grid gap-3">
        {story.scenes.map((scene, i) => (
          <li key={i} className="hadith-card">
            <div className="mb-2 flex items-center gap-2">
              <span className="ps-scene-num" aria-hidden="true">{i + 1}</span>
              <h2 className="font-amiri text-base font-bold text-azkar-teal-ink">{scene.heading}</h2>
            </div>
            <p className={`leading-loose text-azkar-ink ${fontClass}`}>{scene.text}</p>
          </li>
        ))}
      </ol>

      <blockquote className="ps-verse">
        <p className="font-amiri">﴿{story.verse.text}﴾</p>
        <cite>{story.verse.ref}</cite>
      </blockquote>

      <section className="hadith-card">
        <h2 className="mb-2 flex items-center gap-2 font-amiri text-base font-bold text-azkar-teal-ink">
          <BookOpen className="h-4 w-4 text-azkar-gold-deep" aria-hidden="true" /> العِبَر
        </h2>
        <ul className="ps-lessons">
          {story.lessons.map((lesson, i) => (
            <li key={i}>{lesson}</li>
          ))}
        </ul>
      </section>

      {showQuestion && (
        <div className="ps-question">
          <h2>تأمّل</h2>
          <p>{story.question}</p>
        </div>
      )}

      {onNext && (
        <button type="button" onClick={onNext} className="u-pressable ps-next">
          القصة التالية
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      <button type="button" onClick={onBack} className="u-pressable ps-backlist">
        عودة إلى القائمة
      </button>
    </article>
  )
}
