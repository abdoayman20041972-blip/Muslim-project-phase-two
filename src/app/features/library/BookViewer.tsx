import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { toArabicNumber } from '../../constants'
import { BookReader } from './BookReader'
import { ScreenHeader } from './ScreenHeader'
import type { LibraryBook } from './libraryData'

export type BookChapter = { g: string; t: string; p: string[] }
export type BookFile = { meta?: { total?: number; complete: boolean; gap?: string; from?: string; to?: string; subtitle?: string; note?: string }; chapters: BookChapter[] }

// The chapter list was rebuilt (sub-page fragments joined to the chapter they belong to). Positions saved by older
// versions (key version 1, a raw index) are moved to the new key through <book>.posmap.json (old index -> new index).
const POS_KEY = (id: string) => `library-pos2-${id}`
const OLD_POS_KEY = (id: string) => `library-pos-${id}`

/** Volumes, then chapters, then a page-turn reader. The text is a static asset in public/books and reads offline. */
export function BookViewer({ book, onClose }: { book: LibraryBook; onClose: () => void }) {
  const [data, setData] = useState<BookFile | null>(null)
  const [error, setError] = useState(false)
  const [group, setGroup] = useState<string | null>(null)
  const [chapter, setChapter] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}books/${book.id}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<BookFile>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [book.id])

  const [, setMigrated] = useState(0)
  useEffect(() => {
    let old: string | null = null
    try { old = localStorage.getItem(OLD_POS_KEY(book.id)); if (localStorage.getItem(POS_KEY(book.id)) !== null) old = null } catch { old = null }
    if (old === null) return
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}books/${book.id}.posmap.json`)
      .then((r) => (r.ok ? (r.json() as Promise<number[]>) : Promise.reject(new Error(String(r.status)))))
      .then((map) => {
        const target = map[Number(old)]
        if (!cancelled && Number.isInteger(target)) { try { localStorage.setItem(POS_KEY(book.id), String(target)) } catch { /* private mode */ } setMigrated((n) => n + 1) }
      })
      .catch(() => { /* no map for this book: the saved place is simply not offered */ })
    return () => { cancelled = true }
  }, [book.id])

  const groups = useMemo(() => {
    const map = new Map<string, number[]>()
    data?.chapters.forEach((c, i) => map.set(c.g, [...(map.get(c.g) ?? []), i]))
    return [...map.entries()].map(([name, idx]) => ({ name, idx }))
  }, [data])

  useEffect(() => { if (chapter !== null) try { localStorage.setItem(POS_KEY(book.id), String(chapter)) } catch { /* private mode */ } }, [chapter, book.id])

  const goBack = chapter !== null ? () => setChapter(null) : group !== null ? () => { setGroup(null); setQuery('') } : onClose
  const backLabel = chapter !== null ? 'رجوع إلى قائمة الفصول' : group !== null ? 'رجوع إلى الأجزاء' : 'رجوع إلى المكتبة'
  const credit = `${book.author} ${book.died} · ${book.edition} · النص من ويكي مصدر (CC BY-SA 4.0)${data?.meta?.complete ? ' · كامل بحسب فهرس ويكي مصدر لهذه الطبعة' : ' · نسخة غير مكتملة'}`

  if (error) return <div className="w-full"><ScreenHeader title={book.title} onBack={goBack} backLabel={backLabel} /><p role="alert" className="mt-4 text-center font-bold text-azkar-ink-soft">تعذر تحميل الكتاب</p></div>
  if (!data) return <div className="w-full"><ScreenHeader title={book.title} onBack={goBack} backLabel={backLabel} /><p role="status" className="mt-4 text-center font-bold text-azkar-ink-soft">جارٍ تحميل الكتاب…</p></div>

  if (chapter !== null) {
    const c = data.chapters[chapter]
    const last = data.chapters.length - 1
    return (
      <div className="w-full min-w-0" data-testid="book-chapter">
        <ScreenHeader title={c.t} subtitle={`${book.title} · ${c.g}`} onBack={goBack} backLabel={backLabel} />
        <BookReader
          key={chapter}
          paragraphs={c.p}
          credit="ويكي مصدر · CC BY-SA 4.0"
          hasNextChapter={chapter < last}
          hasPrevChapter={chapter > 0}
          onNextChapter={() => setChapter(chapter + 1)}
          onPrevChapter={() => setChapter(chapter - 1)}
        />
      </div>
    )
  }

  const saved = (() => { try { const v = localStorage.getItem(POS_KEY(book.id)); return v === null ? -1 : Number(v) } catch { return -1 } })()
  const list = group === null ? null : groups.find((g) => g.name === group)
  const q = query.trim()
  const shown = list ? list.idx.filter((i) => !q || data.chapters[i].t.includes(q)) : []
  const range = data.meta?.from && data.meta?.to ? `من ${data.meta.from} إلى ${data.meta.to}` : undefined

  return (
    <div className="w-full min-w-0" data-testid="book-toc">
      <ScreenHeader title={list ? list.name : book.title} subtitle={list ? `${toArabicNumber(list.idx.length)} فصلًا` : (book.id.startsWith('bidaya') ? `${book.author} · البداية والنهاية` : `${book.author} ${book.died}`)} onBack={goBack} backLabel={backLabel} />
      {data.meta && !data.meta.complete && !list && <p role="note" data-testid="book-partial" className="lib-note lib-note-warn">تنبيه: هذه النسخة غير مكتملة. المتاح للقراءة {toArabicNumber(data.chapters.length)} فصلًا{data.meta.gap ? `، وينقص منها ${data.meta.gap}` : '، وليس الكتاب كاملًا'}.</p>}
      {!list && data.meta?.note && <p role="note" data-testid="book-note" className="lib-note">{data.meta.note}</p>}
      {!list && !data.meta?.note && range && <p role="note" data-testid="book-range" className="lib-note">النص المتاح هنا {range} في طبعة السعادة، ولذلك تبدأ القائمة من {groups[0]?.name}. لا يتوفر في هذا التطبيق نص للأجزاء السابقة.</p>}
      {saved >= 0 && saved < data.chapters.length && !list && (
        <button type="button" onClick={() => setChapter(saved)} className="lib-continue u-pressable"><span className="lib-continue-label">متابعة القراءة</span><span className="lib-continue-title">{data.chapters[saved].t}</span></button>
      )}
      {list && <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في عناوين الفصول" aria-label="ابحث في عناوين الفصول" className="lib-search" />}
      <ul className="lib-list">
        {list
          ? shown.map((i) => (
              <li key={i}><button type="button" onClick={() => setChapter(i)} className="lib-row u-pressable"><span className="lib-row-n">{toArabicNumber(list.idx.indexOf(i) + 1)}</span><span className="lib-row-t">{data.chapters[i].t}</span></button></li>
            ))
          : groups.map((g) => (
              <li key={g.name}><button type="button" onClick={() => setGroup(g.name)} className="lib-row lib-row-vol u-pressable"><span className="lib-row-t">{g.name}</span><span className="lib-row-count">{toArabicNumber(g.idx.length)} فصلًا</span><ChevronLeft className="h-4 w-4 shrink-0 text-azkar-ink-soft" aria-hidden="true" /></button></li>
            ))}
      </ul>
      {!list && <p className="lib-credit">{credit}</p>}
    </div>
  )
}
