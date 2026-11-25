import { ArrowRight, ExternalLink } from 'lucide-react'
import { toArabicNumber } from '../../constants'
import { LESSON_EPISODES, LESSON_SERIES, lessonWatchUrl } from './lessonsData'

const minutes = (sec: number) => `${toArabicNumber(Math.round(sec / 60))} دقيقة`

/** Episode list. Each episode opens on YouTube (outside the app); the app does not play or store the videos. */
export function LessonsView({ onBack }: { onBack: () => void }) {
  return (
    <div className="w-full min-w-0" data-testid="lessons-view">
      <button type="button" onClick={onBack} className="u-pressable mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[0.875rem] font-bold text-azkar-teal-ink"><ArrowRight className="h-4 w-4" />المكتبة</button>
      <h1 className="font-amiri text-[1.5rem] font-bold text-azkar-teal-ink">دروس السيرة النبوية</h1>
      <p className="mt-1 text-[0.8125rem] font-semibold text-azkar-ink-soft">{LESSON_SERIES.teacher} · {toArabicNumber(LESSON_EPISODES.length)} حلقة. كل حلقة تفتح على يوتيوب خارج التطبيق.</p>
      <ul className="mt-4 flex flex-col gap-2">
        {LESSON_EPISODES.map((e) => (
          <li key={e.id}>
            <a href={lessonWatchUrl(e.id)} target="_blank" rel="noopener noreferrer" className="u-pressable flex min-h-[3.25rem] items-center justify-between gap-3 rounded-xl border border-azkar-hairline bg-azkar-card px-4 py-3 text-right font-bold text-azkar-teal-ink">
              <span>الحلقة {toArabicNumber(e.n)}</span>
              <span className="flex items-center gap-2 text-[0.75rem] font-semibold text-azkar-ink-soft">{minutes(e.sec)}<ExternalLink className="h-4 w-4" aria-hidden="true" /></span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
