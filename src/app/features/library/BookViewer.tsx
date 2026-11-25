import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { toArabicNumber } from '../../constants'
import { BookReader } from './BookReader'
import type { LibraryBook } from './libraryData'

export type BookChapter = { g: string; t: string; p: string[] }
export type BookFile = { meta?: { total?: number; complete: boolean; gap?: string }; chapters: BookChapter[] }

const POS_KEY = (id: string) => `library-pos-${id}`

/** Chapter list grouped by section, and a chapter-by-chapter page-turn reader. The text is a static asset in public/books. */
export function BookViewer({ book, onClose }: { book: LibraryBook; onClose: () => void }) {
  const [data, setData] = useState<BookFile | null>(null)
  const [error, setError] = useState(false)
  const [group, setGroup] = useState<string | null>(null)
  const [chapter, setChapter] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}books/${book.id}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<BookFile>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [book.id])

  const groups = useMemo(() => {
    const map = new Map<string, number[]>()
    data?.chapters.forEach((c, i) => map.set(c.g, [...(map.get(c.g) ?? []), i]))
    return [...map.entries()].map(([name, idx]) => ({ name, idx }))
  }, [data])
  const [query, setQuery] = useState('')

  useEffect(() => { if (chapter !== null) try { localStorage.setItem(POS_KEY(book.id), String(chapter)) } catch { /* private mode */ } }, [chapter, book.id])

  const back = (
    <button type="button" onClick={chapter !== null ? () => setChapter(null) : group !== null ? () => setGroup(null) : onClose} className="u-pressable mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[0.875rem] font-bold text-azkar-teal-ink"><ArrowRight className="h-4 w-4" />{chapter !== null ? 'فهرس الكتاب' : group !== null ? 'الأقسام' : 'المكتبة'}</button>
  )

  if (error) return <div className="w-full">{back}<p role="alert" className="mt-4 text-center font-bold text-azkar-ink-soft">تعذر تحميل الكتاب</p></div>
  if (!data) return <div className="w-full">{back}<p role="status" className="mt-4 text-center font-bold text-azkar-ink-soft">جارٍ تحميل الكتاب…</p></div>

  if (chapter !== null) {
    const c = data.chapters[chapter]
    const has = (i: number) => i >= 0 && i < data.chapters.length
    return (
      <div className="w-full min-w-0" data-testid="book-chapter">
        {back}
        <BookReader key={chapter} title={book.title} heading={c.t} paragraphs={c.p} credit={`${book.author} ${book.died} · ${book.edition} · النص من ويكي مصدر (CC BY-SA 4.0)${data.meta?.complete ? ' · كامل بحسب فهرس ويكي مصدر لهذه الطبعة' : ' · نسخة غير مكتملة'}`} />
        <div className="mt-2 flex justify-between gap-2">
          <button type="button" data-sound="none" disabled={!has(chapter + 1)} onClick={() => setChapter(chapter + 1)} className="book-btn"><ChevronRight className="h-5 w-5" />الفصل التالي</button>
          <button type="button" data-sound="none" disabled={!has(chapter - 1)} onClick={() => setChapter(chapter - 1)} className="book-btn">الفصل السابق<ChevronLeft className="h-5 w-5" /></button>
        </div>
      </div>
    )
  }

  const saved = (() => { try { return Number(localStorage.getItem(POS_KEY(book.id))) } catch { return 0 } })()
  const list = group === null ? null : groups.find((g) => g.name === group)
  const q = query.trim()
  const shown = list ? list.idx.filter((i) => !q || data.chapters[i].t.includes(q)) : []

  return (
    <div className="w-full min-w-0" data-testid="book-toc">
      {back}
      <h2 className="font-amiri text-[1.375rem] font-bold text-azkar-teal-ink">{book.title}</h2>
      {data.meta && !data.meta.complete && <p role="note" data-testid="book-partial" className="mt-2 rounded-xl border border-[#d9a65a] bg-[#fdf1dc] px-3 py-2 text-[0.8125rem] font-bold leading-relaxed text-[#8a4b12]">تنبيه: هذه النسخة غير مكتملة. المتاح للقراءة {toArabicNumber(data.chapters.length)} فصلًا{data.meta.gap ? `، وينقص منها ${data.meta.gap}` : '، وليس الكتاب كاملًا'}.</p>}
      {saved > 0 && saved < data.chapters.length && group === null && (
        <button type="button" onClick={() => setChapter(saved)} className="u-pressable mt-3 w-full rounded-2xl bg-azkar-teal-tint px-4 py-3 text-right font-bold text-azkar-teal-ink">متابعة القراءة: {data.chapters[saved].t}</button>
      )}
      {list && <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في عناوين الفصول" aria-label="ابحث في عناوين الفصول" className="mt-3 w-full rounded-xl border border-azkar-hairline bg-azkar-card px-4 py-3 text-right font-semibold" />}
      <ul className="mt-3 flex flex-col gap-2">
        {list
          ? shown.map((i) => (
              <li key={i}><button type="button" onClick={() => setChapter(i)} className="u-pressable w-full rounded-xl border border-azkar-hairline bg-azkar-card px-4 py-3 text-right font-semibold text-azkar-teal-ink">{data.chapters[i].t}</button></li>
            ))
          : groups.map((g) => (
              <li key={g.name}><button type="button" onClick={() => setGroup(g.name)} className="u-pressable flex w-full items-center justify-between rounded-xl border border-azkar-hairline bg-azkar-card px-4 py-3 text-right font-bold text-azkar-teal-ink"><span>{g.name}</span><span className="text-[0.75rem] text-azkar-ink-soft">{g.idx.length} فصل</span></button></li>
            ))}
      </ul>
    </div>
  )
}
