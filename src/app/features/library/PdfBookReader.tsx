import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react'
import { toArabicNumber } from '../../constants'

type Props = { title: string; pdfUrl: string; credit: string; firstPage?: number }
type Doc = { numPages: number; getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown; canvas: HTMLCanvasElement }) => { promise: Promise<void> } }>; destroy: () => Promise<void> }

/**
 * Scanned-book reader: shows the original printed page as an image, one page at a time, loaded on demand from the PDF
 * (HTTP range requests, so only the pages you open are downloaded). No text layer, no search. pdf.js is loaded on first use.
 */
export function PdfBookReader({ title, pdfUrl, credit, firstPage = 1 }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const docRef = useRef<Doc | null>(null)
  const [pages, setPages] = useState(0)
  const [page, setPage] = useState(firstPage)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [zoom, setZoom] = useState(1)
  const [turn, setTurn] = useState<'fwd' | 'back' | null>(null)

  useEffect(() => {
    let cancelled = false
    setState('loading')
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
        pdfjs.GlobalWorkerOptions.workerSrc = worker
        const doc = (await pdfjs.getDocument({ url: pdfUrl, rangeChunkSize: 65536, wasmUrl: `${import.meta.env.BASE_URL}pdfjs/wasm/` }).promise) as unknown as Doc
        if (cancelled) { void doc.destroy(); return }
        docRef.current = doc
        setPages(doc.numPages)
      } catch (e) { (window as unknown as { __pdfErr?: string }).__pdfErr = String(e); if (!cancelled) setState('error') }
    })()
    return () => { cancelled = true; void docRef.current?.destroy(); docRef.current = null }
  }, [pdfUrl])

  useEffect(() => {
    const doc = docRef.current
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!doc || !canvas || !stage || !pages) return
    let cancelled = false
    ;(async () => {
      try {
        const p = await doc.getPage(Math.min(Math.max(page, 1), doc.numPages))
        const base = p.getViewport({ scale: 1 })
        const scale = (stage.clientWidth / base.width) * zoom * Math.min(window.devicePixelRatio || 1, 2)
        const viewport = p.getViewport({ scale })
        canvas.width = Math.floor(viewport.width); canvas.height = Math.floor(viewport.height)
        canvas.style.width = `${zoom * 100}%`
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('no canvas')
        await p.render({ canvasContext: ctx, viewport, canvas }).promise
        if (!cancelled) { stage.scrollLeft = stage.scrollWidth; stage.scrollTop = 0; setState('ready') }
      } catch { if (!cancelled) setState('error') }
    })()
    return () => { cancelled = true }
  }, [page, pages, zoom])

  useEffect(() => {
    if (!turn) return
    const id = window.setTimeout(() => setTurn(null), 380)
    return () => window.clearTimeout(id)
  }, [turn])

  const go = useCallback((d: 1 | -1) => {
    setPage((n) => { const next = Math.min(pages, Math.max(1, n + d)); if (next !== n) setTurn(d === 1 ? 'fwd' : 'back'); return next })
  }, [pages])

  return (
    <div className="book-reader pdf-reader" data-testid="pdf-book-reader">
      <div className="book-reader-top"><span className="book-reader-title">{title}</span><span className="book-reader-count">{pages ? `صفحة ${toArabicNumber(page)} من ${toArabicNumber(pages)} في الملف` : ''}</span></div>
      <div className="book-spread">
        <div ref={stageRef} className="book-stage pdf-stage">
          <canvas ref={canvasRef} className={`pdf-canvas ${turn ? `pdf-turn-${turn}` : ''}`} aria-label={`صفحة ${page} من الكتاب المصور`} />
          {state === 'loading' && <div className="pdf-note" role="status">جارٍ تحميل الصفحة…</div>}
          {state === 'error' && <div className="pdf-note" role="alert">تعذر تحميل الصفحة. تحتاج هذه الصفحة إلى اتصال بالإنترنت.</div>}
        </div>
      </div>
      <div className="pdf-zoom" role="group" aria-label="التكبير">
        <button type="button" data-sound="none" onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))} disabled={zoom <= 1} aria-label="تصغير" className="book-btn"><Minus className="h-5 w-5" /></button>
        <button type="button" data-sound="none" onClick={() => setZoom(1)} disabled={zoom === 1} aria-label="إعادة الحجم" className="book-btn"><RotateCcw className="h-4 w-4" />{toArabicNumber(Math.round(zoom * 100))}٪</button>
        <button type="button" data-sound="none" onClick={() => setZoom((z) => Math.min(3, +(z + 0.5).toFixed(1)))} disabled={zoom >= 3} aria-label="تكبير" className="book-btn"><Plus className="h-5 w-5" /></button>
      </div>
      <div className="book-controls">
        <button type="button" data-sound="none" onClick={() => go(1)} disabled={!pages || page >= pages} aria-label="الصفحة التالية" className="book-btn"><ChevronRight className="h-5 w-5" />التالية</button>
        <button type="button" data-sound="none" onClick={() => go(-1)} disabled={page <= 1} aria-label="الصفحة السابقة" className="book-btn">السابقة<ChevronLeft className="h-5 w-5" /></button>
      </div>
      <p className="book-credit">{credit}</p>
    </div>
  )
}
