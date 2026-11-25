import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toArabicNumber } from '../../constants'

type Props = { title: string; heading?: string; paragraphs: string[]; credit: string; onClose?: () => void }

/**
 * Page-turn reader. The text is laid out in CSS columns, one column per page, so pages break where the text
 * really fills them. Turning a page folds the current leaf over the spine (right edge), like an Arabic book.
 */
export function BookReader({ title, heading, paragraphs, credit }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(0)
  const [turn, setTurn] = useState<null | { from: number; to: number }>(null)

  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const read = () => setSize({ w: Math.floor(el.clientWidth), h: Math.floor(el.clientHeight) })
    read()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', read)
      return () => window.removeEventListener('resize', read)
    }
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el || !size.w) return
    setPages(Math.max(1, Math.round(el.scrollWidth / size.w)))
  }, [size, paragraphs])

  const go = useCallback((delta: 1 | -1) => {
    setPage((current) => {
      const next = Math.min(pages - 1, Math.max(0, current + delta))
      if (next === current) return current
      setTurn({ from: current, to: next })
      return next
    })
  }, [pages])

  useEffect(() => {
    if (!turn) return
    const id = window.setTimeout(() => setTurn(null), 520)
    return () => window.clearTimeout(id)
  }, [turn])

  const flow = (index: number) => (
    <div className="book-flow" style={{ height: size.h, columnWidth: size.w, columnGap: 0, width: size.w * pages, transform: `translateX(${-index * size.w}px)` }}>
      {index === 0 && heading && <p className="book-heading">{heading}</p>}
      {paragraphs.map((text, i) => <p key={i} className={text.startsWith('↑') ? `book-para book-note${paragraphs[i - 1]?.startsWith('↑') ? '' : ' book-note-first'}` : 'book-para'}>{text}</p>)}
    </div>
  )
  const shown = turn ? turn.to : page
  const forward = turn ? turn.to > turn.from : true

  return (
    <div className="book-reader" data-testid="book-reader">
      <div className="book-reader-top"><span className="book-reader-title">{title}</span><span className="book-reader-count">صفحة {toArabicNumber(page + 1)} من {toArabicNumber(pages)} في هذا الفصل</span></div>
      <div className="book-spread">
        <div ref={stageRef} className="book-stage">
          <div className="book-page book-page-under" style={{ width: size.w, height: size.h }}>{size.w > 0 && flow(turn ? (forward ? turn.to : turn.from) : shown)}</div>
          {turn && (
            <div className={`book-leaf ${forward ? 'book-leaf-fwd' : 'book-leaf-back'}`} style={{ width: size.w, height: size.h }}>
              <div className="book-page" style={{ width: size.w, height: size.h }}>{flow(forward ? turn.from : turn.to)}</div>
              <div className="book-leaf-shade" aria-hidden="true" />
            </div>
          )}
          <div ref={measureRef} className="book-measure" aria-hidden="true" style={{ height: size.h, columnWidth: size.w, columnGap: 0 }}>
            {heading && <p className="book-heading">{heading}</p>}
            {paragraphs.map((text, i) => <p key={i} className={text.startsWith('↑') ? `book-para book-note${paragraphs[i - 1]?.startsWith('↑') ? '' : ' book-note-first'}` : 'book-para'}>{text}</p>)}
          </div>
        </div>
      </div>
      <div className="book-controls">
        <button type="button" data-sound="none" onClick={() => go(1)} disabled={page >= pages - 1} aria-label="الصفحة التالية" className="book-btn"><ChevronRight className="h-5 w-5" />التالية</button>
        <button type="button" data-sound="none" onClick={() => go(-1)} disabled={page === 0} aria-label="الصفحة السابقة" className="book-btn">السابقة<ChevronLeft className="h-5 w-5" /></button>
      </div>
      <p className="book-credit">{credit}</p>
    </div>
  )
}
