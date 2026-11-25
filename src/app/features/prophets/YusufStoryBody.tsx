import { useEffect, useState } from 'react'
import { loadSurah } from '../quran/loadSurah'
import { YUSUF_INTRO_HADITH, YUSUF_INTRO_VERSES, YUSUF_SCENES, type YusufPara } from './yusufStory'
import './prophets.css'

const SURAH_NUMBER = 12
const toArabicDigits = (n: number) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
const BASMALA_WORDS = 4

/** The mushaf text of ayah 1 carries the basmala in front of it. It is not part of the ayah. */
export function ayahDisplayText(numberInSurah: number, text: string): string {
  if (numberInSurah !== 1) return text
  const words = text.split(' ')
  return words[0]?.startsWith('بِسْ') ? words.slice(BASMALA_WORDS).join(' ') : text
}

function useYusufAyahs() {
  const [ayahs, setAyahs] = useState<Map<number, string> | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    loadSurah(SURAH_NUMBER)
      .then((list) => {
        if (live) setAyahs(new Map(list.map((a) => [a.numberInSurah, ayahDisplayText(a.numberInSurah, a.text)])))
      })
      .catch(() => {
        if (live) setFailed(true)
      })
    return () => {
      live = false
    }
  }, [])
  return { ayahs, failed }
}

export function ayahReference(from: number, to: number): string {
  return from === to
    ? `سورة يوسف، الآية ${toArabicDigits(from)}`
    : `سورة يوسف، الآيات ${toArabicDigits(from)} إلى ${toArabicDigits(to)}`
}

function VerseBlock({ range, ayahs, failed }: { range: [number, number]; ayahs: Map<number, string> | null; failed: boolean }) {
  const numbers: number[] = []
  for (let n = range[0]; n <= range[1]; n++) numbers.push(n)
  return (
    <figure className="ys-verse" data-testid="ys-verse">
      <figcaption className="ys-verse-label">قال تعالى</figcaption>
      <div className="ys-verse-row">
        {ayahs ? (
          <p className="ys-verse-text font-amiri">
            {numbers.map((n) => (
              <span key={n}>
                {ayahs.get(n) ?? ''}{' '}
                <bdi className="ys-ayah-no">{toArabicDigits(n)}</bdi>{' '}
              </span>
            ))}
          </p>
        ) : (
          <p className="ys-verse-text ys-verse-wait">{failed ? 'تعذّر تحميل الآيات. افتح المصحف لقراءتها.' : 'جارٍ تحميل الآيات'}</p>
        )}
      </div>
      <cite className="ys-verse-ref">{ayahReference(range[0], range[1])}</cite>
    </figure>
  )
}

function HadithBlock({ text, source }: { text: string; source: string }) {
  return (
    <figure className="ys-hadith">
      <figcaption className="ys-hadith-label">حديث شريف</figcaption>
      <blockquote className="ys-hadith-text">{text}</blockquote>
      <cite className="ys-verse-ref">{source}</cite>
    </figure>
  )
}

function Para({ para, fontClass }: { para: YusufPara; fontClass: string }) {
  if (para.k === 't') {
    const who = para.w === 'ابن كثير' ? 'من تفسير ابن كثير' : `جاء في تفسير ابن كثير، عن ${para.w}`
    return (
      <aside className="ys-tafsir">
        <div className="ys-tafsir-who">{who}</div>
        <p className={`ys-tafsir-text ${fontClass}`}>{para.t}</p>
      </aside>
    )
  }
  return <p className={`ys-prose ${fontClass}`}>{para.t}</p>
}

export function YusufStoryBody({ fontClass }: { fontClass: string }) {
  const { ayahs, failed } = useYusufAyahs()
  return (
    <div className="ys-body">
      <VerseBlock range={YUSUF_INTRO_VERSES} ayahs={ayahs} failed={failed} />
      <HadithBlock text={YUSUF_INTRO_HADITH.t} source={YUSUF_INTRO_HADITH.s} />
      <ol className="ys-scenes">
        {YUSUF_SCENES.map((scene, i) => (
          <li key={scene.h} className="ys-scene">
            <div className="ys-scene-head">
              <span className="ys-scene-no" aria-hidden="true">{toArabicDigits(i + 1)}</span>
              <h2 className="font-amiri">{scene.h}</h2>
            </div>
            {scene.p.map((para, k) => (
              <Para key={k} para={para} fontClass={fontClass} />
            ))}
            {scene.v.map((range) => (
              <VerseBlock key={range.join('-')} range={range} ayahs={ayahs} failed={failed} />
            ))}
            {scene.hd ? <HadithBlock text={scene.hd.t} source={scene.hd.s} /> : null}
          </li>
        ))}
      </ol>
    </div>
  )
}
