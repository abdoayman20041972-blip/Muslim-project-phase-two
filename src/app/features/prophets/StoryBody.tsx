import { useEffect, useState } from 'react'
import { surahList } from '../../../quran-meta'
import { loadSurah } from '../quran/loadSurah'
import { ayahDisplayText } from './YusufStoryBody'
import type { StoryContent, StoryPara, StoryVerse } from './storyTypes'
import './prophets.css'

const toArabicDigits = (n: number) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])

export function surahShortName(surah: number): string {
  return surahList.find((s) => s.number === surah)?.shortName ?? ''
}

export function storyAyahReference([surah, from, to]: StoryVerse): string {
  const name = `سورة ${surahShortName(surah)}`
  return from === to
    ? `${name}، الآية ${toArabicDigits(from)}`
    : `${name}، الآيات ${toArabicDigits(from)} إلى ${toArabicDigits(to)}`
}

export function storySurahs(content: StoryContent): number[] {
  const all = [...(content.intro?.v ?? []), ...content.scenes.flatMap((s) => s.v)]
  return Array.from(new Set(all.map((v) => v[0])))
}

type AyahMap = Map<number, Map<number, string>>

function useStoryAyahs(surahs: number[]) {
  const [ayahs, setAyahs] = useState<AyahMap | null>(null)
  const [failed, setFailed] = useState(false)
  const key = surahs.join(',')
  useEffect(() => {
    let live = true
    setAyahs(null)
    setFailed(false)
    Promise.all(surahs.map((n) => loadSurah(n)))
      .then((lists) => {
        if (!live) return
        const map: AyahMap = new Map()
        surahs.forEach((n, i) => map.set(n, new Map(lists[i].map((a) => [a.numberInSurah, ayahDisplayText(a.numberInSurah, a.text)]))))
        setAyahs(map)
      })
      .catch(() => {
        if (live) setFailed(true)
      })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return { ayahs, failed }
}

function Ornament({ side }: { side: 'open' | 'close' }) {
  return (
    <svg className={`ys-orn ys-orn-${side}`} viewBox="0 0 16 44" aria-hidden="true" focusable="false">
      <path d="M3 3 Q14 22 3 41" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 8 Q14 22 8 36" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".6" />
      <circle cx="12.5" cy="22" r="1.4" fill="currentColor" />
    </svg>
  )
}

function VerseBlock({ verse, ayahs, failed }: { verse: StoryVerse; ayahs: AyahMap | null; failed: boolean }) {
  const [surah, from, to] = verse
  const numbers: number[] = []
  for (let n = from; n <= to; n++) numbers.push(n)
  const list = ayahs?.get(surah)
  return (
    <figure className="ys-verse" data-testid="ys-verse">
      <figcaption className="ys-verse-label">قال تعالى</figcaption>
      <div className="ys-verse-row">
        <Ornament side="open" />
        {list ? (
          <p className="ys-verse-text font-amiri">
            {numbers.map((n) => (
              <span key={n}>
                {list.get(n) ?? ''}{' '}
                <bdi className="ys-ayah-no">{toArabicDigits(n)}</bdi>{' '}
              </span>
            ))}
          </p>
        ) : (
          <p className="ys-verse-text ys-verse-wait">{failed ? 'تعذّر تحميل الآيات. افتح المصحف لقراءتها.' : 'جارٍ تحميل الآيات'}</p>
        )}
        <Ornament side="close" />
      </div>
      <cite className="ys-verse-ref">{storyAyahReference(verse)}</cite>
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

function Para({ para, fontClass }: { para: StoryPara; fontClass: string }) {
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

export function StoryBody({ content, fontClass }: { content: StoryContent; fontClass: string }) {
  const { ayahs, failed } = useStoryAyahs(storySurahs(content))
  return (
    <div className="ys-body" data-story={content.id}>
      {content.intro?.v.map((v) => <VerseBlock key={v.join('-')} verse={v} ayahs={ayahs} failed={failed} />)}
      {content.intro?.hd ? <HadithBlock text={content.intro.hd.t} source={content.intro.hd.s} /> : null}
      <ol className="ys-scenes">
        {content.scenes.map((scene, i) => (
          <li key={scene.h} className="ys-scene">
            <div className="ys-scene-head">
              <span className="ys-scene-no" aria-hidden="true">{toArabicDigits(i + 1)}</span>
              <h2 className="font-amiri">{scene.h}</h2>
            </div>
            {scene.p.map((para, k) => (
              <Para key={k} para={para} fontClass={fontClass} />
            ))}
            {scene.v.map((v) => (
              <VerseBlock key={v.join('-')} verse={v} ayahs={ayahs} failed={failed} />
            ))}
            {scene.hd ? <HadithBlock text={scene.hd.t} source={scene.hd.s} /> : null}
          </li>
        ))}
      </ol>
    </div>
  )
}
