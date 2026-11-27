import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toArabicNumber } from '../../constants'
import { CopyButton } from '../azkar/CopyButton'

type Props = {
  paragraphs: string[]
  credit: string
  /** Whole chapter text for the copy button; omitted means no button. */
  copyText?: string
  copyReference?: string
  hasNextChapter?: boolean
  hasPrevChapter?: boolean
  onNextChapter?: () => void
  onPrevChapter?: () => void
}

/**
 * Page-turn reader. The text is laid out in CSS columns, one column per page, so pages break where the text
 * really fills them. Turning a page folds the current leaf over the spine (right edge), like an Arabic book.
 * The two buttons are one control: on the last page "next" continues into the next chapter, on the first page
 * "previous" goes to the previous chapter, so the reader needs no second row of buttons.
 */
export function BookReader({ paragraphs, credit, copyText, copyReference, hasNextChapter, hasPrevChapter, onNextChapter, onPrevChapter }: Props) {
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

  // A resize can shrink the page count below the current page (rotation, split-screen): clamp so the reader never lands on a blank page.
  useEffect(() => { setPage((current) => Math.min(current, pages - 1)) }, [pages])

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

  const para = (text: string, i: number) => <p key={i} className={text.startsWith('↑') ? `book-para book-note${paragraphs[i - 1]?.startsWith('↑') ? '' : ' book-note-first'}` : 'book-para'}>{text}</p>
  const flow = (index: number) => (
    <div className="book-flow" style={{ height: size.h, columnWidth: size.w, columnGap: 0, width: size.w * pages, transform: `translateX(${-index * size.w}px)` }}>
      {paragraphs.map(para)}
    </div>
  )
  const shown = turn ? turn.to : page
  const forward = turn ? turn.to > turn.from : true
  const atEnd = page >= pages - 1
  const atStart = page === 0
  const nextIsChapter = atEnd && !!hasNextChapter
  const prevIsChapter = atStart && !!hasPrevChapter

  return (
    <div className="book-reader" data-testid="book-reader">
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
            {paragraphs.map(para)}
          </div>
        </div>
      </div>
      <div className="book-controls">
        <button type="button" data-sound="none" onClick={() => (prevIsChapter ? onPrevChapter?.() : go(-1))} disabled={atStart && !hasPrevChapter} className="book-btn"><ChevronRight className="h-5 w-5" aria-hidden="true" />{prevIsChapter ? 'الفصل السابق' : 'السابقة'}</button>
        <span className="book-count" data-testid="book-count" dir="rtl">صفحة {toArabicNumber(page + 1)} من {toArabicNumber(pages)}</span>
        <button type="button" data-sound="none" onClick={() => (nextIsChapter ? onNextChapter?.() : go(1))} disabled={atEnd && !hasNextChapter} className="book-btn book-btn-next">{nextIsChapter ? 'الفصل التالي' : 'التالية'}<ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
      </div>
      <p className="book-credit">{credit}</p>
      {copyText ? <div className="flex justify-center pb-1"><CopyButton text={copyText} reference={copyReference} label="نسخ الفصل" className="h-7" /></div> : null}
    </div>
  )
}
