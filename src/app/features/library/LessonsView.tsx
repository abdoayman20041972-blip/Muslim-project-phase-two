import { ExternalLink } from 'lucide-react'
import { toArabicNumber } from '../../constants'
import { ScreenHeader } from './ScreenHeader'
import { LESSON_EPISODES, LESSON_SERIES, lessonWatchUrl } from './lessonsData'

const minutes = (sec: number) => `${toArabicNumber(Math.round(sec / 60))} دقيقة`

/** Episode list. Each episode opens on YouTube (outside the app); the app does not play or store the videos. */
export function LessonsView({ onBack }: { onBack: () => void }) {
  return (
    <div className="w-full min-w-0" data-testid="lessons-view">
      <ScreenHeader title="دروس السيرة النبوية" subtitle={`${LESSON_SERIES.teacher} · ${toArabicNumber(LESSON_EPISODES.length)} حلقة`} onBack={onBack} backLabel="رجوع إلى المكتبة" />
      <p className="lib-note">كل حلقة تفتح على يوتيوب خارج التطبيق، وتحتاج اتصالًا بالإنترنت. التطبيق لا يشغّل الفيديو ولا يحفظه.</p>
      <ul className="lib-list">
        {LESSON_EPISODES.map((e) => (
          <li key={e.id}>
            <a href={lessonWatchUrl(e.id)} target="_blank" rel="noopener noreferrer" className="lib-row u-pressable">
              <span className="lib-row-n">{toArabicNumber(e.n)}</span>
              <span className="lib-row-t">الحلقة {toArabicNumber(e.n)}</span>
              <span className="lib-row-count">{minutes(e.sec)}</span>
              <ExternalLink className="h-4 w-4 shrink-0 text-azkar-ink-soft" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
